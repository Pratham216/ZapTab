import fs from "fs/promises";
import path from "path";
import { ParsedBillSchema } from "@zaptab/shared";
import {
  config,
  getActiveVisionModel,
  getModelTag,
  isVisionConfigured,
} from "../config";

const VISION_PROMPT = `You are a precision restaurant bill parser. Read the receipt image carefully and extract structured data.

Return ONLY valid JSON matching this schema:
{
  "restaurantName": "string",
  "billDate": "string (as shown on bill, e.g. YYYY-MM-DD or DD/MM/YYYY)",
  "items": [{ "name": "string", "price": number, "quantity": number, "unitPrice": number or null }],
  "subtotal": number or null,
  "tax": number,
  "serviceCharge": number,
  "cgst": number,
  "sgst": number,
  "vat": number,
  "otherTax": number,
  "discount": number,
  "tip": number,
  "grandTotal": number or null,
  "receiptSubtotal": number or null,
  "printedBillTotal": number or null,
  "roundedPayableTotal": number or null
}

Strict Rules for Item Extraction:
1. Extract EVERY purchased line item visible on the receipt. Never omit any item.
2. PRESERVE DUPLICATE LINES: Receipts often contain multiple identical items listed on separate lines (e.g. 3 separate lines of "RED BULL ENERGY DRINK"). You MUST keep them as 3 separate items in the "items" array. Never collapse, merge, or deduplicate separate receipt lines into a single entry unless they are printed as a single line with quantity > 1.
3. Quantity & Price:
   - "quantity" = quantity ordered as printed on that item line (default 1).
   - "price" = LINE TOTAL / AMOUNT column for that item line (not per-unit rate).
   - "unitPrice" = rate per single unit if printed separately on the receipt, else null.
   - Example: Qty 2, Rate 549, Amount 1098 → { "name": "DRUMS OF HEAVEN", "quantity": 2, "price": 1098, "unitPrice": 549 }
4. Separating Charges from Items:
   - Food & beverage items only belong in "items".
   - NEVER put tax, CGST, SGST, VAT, service charge, subtotal, gross total, discount, tip, or payment info into "items".
   - Extract individual charges separately:
     * "cgst" = Central GST amount
     * "sgst" = State GST amount
     * "vat" = VAT amount (e.g. 10% VAT on liquor/beverages)
     * "tax" = total tax (cgst + sgst + vat + otherTax)
     * "serviceCharge" = service charge amount
     * "discount" = total discount amount if present
     * "tip" = tip amount if present
5. Subtotal & Grand Total Breakdown:
   - "subtotal" / "receiptSubtotal": exact printed subtotal before taxes/charges.
   - "printedBillTotal": exact total before rounding.
   - "roundedPayableTotal" / "grandTotal": final payable amount after rounding.
6. MANDATORY INTERNAL SELF-CHECK BEFORE ANSWERING:
   - Calculate SUM(item.price for all extracted items).
   - Compare your calculated sum against the PRINTED RECEIPT SUBTOTAL.
   - If your sum does NOT equal the printed subtotal, you have missed one or more line items (e.g. appetizers, starters, drinks, or items at the top/bottom of the item list).
   - Re-examine the image line by line from top to bottom, locate the omitted line item(s), and include them so the items sum reconciles with the receipt subtotal.
   - Do NOT invent non-existent items to make the numbers match. Locate the actual printed line items from the receipt.
7. Return raw JSON only, with no markdown formatting.`;

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

export function isVisionSupportedImage(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext in MIME_BY_EXT;
}

function parseJsonFromModelContent(content: string) {
  // Strip <think>...</think> reasoning blocks if produced by reasoning models
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 1. Try markdown code fence
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Fall through to brace extraction
    }
  }

  // 2. Try direct JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // 3. Extract outermost { ... } in case model output contains markdown preamble/postamble
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(extracted);
    }
  }

  throw new Error(
    `Model output did not contain valid JSON: ${cleaned.slice(0, 150)}`
  );
}

async function readImageDataUrl(imagePath: string) {
  const ext = path.extname(imagePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new Error(`Vision parsing does not support ${ext} files`);
  }

  const buffer = await fs.readFile(imagePath);
  const base64 = buffer.toString("base64");
  return `data:${mime};base64,${base64}`;
}

async function callOpenRouterVision(dataUrl: string, model: string) {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    signal: AbortSignal.timeout(35000),
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.appUrl || "http://localhost:5173",
      "X-Title": "ZapTab",
    },
    body: JSON.stringify({
      model,
      max_tokens: config.openRouterMaxTokens,
      messages: [
        {
          role: "system",
          content:
            "You are a precision restaurant bill parser. Output ONLY valid JSON starting with { and ending with }. Do not include markdown bolding, conversational text, or explanations.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<{
    choices?: Array<{ message?: { content?: string } }>;
  }>;
}

async function callNvidiaVision(dataUrl: string, model: string) {
  const response = await fetch(NVIDIA_CHAT_URL, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${config.nvidiaApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: config.openRouterMaxTokens,
      temperature: 0.1,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are a precision restaurant bill parser. Output ONLY valid JSON starting with { and ending with }. Do not include markdown bolding, conversational text, or explanations.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<{
    choices?: Array<{ message?: { content?: string } }>;
  }>;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Small vision models sometimes copy the first item line into restaurantName.
// If the name matches any line item, it is not a real header — blank it out.
function sanitizeRestaurantName(parsed: { restaurantName: string; items: Array<{ name: string }> }) {
  const restaurant = normalizeName(parsed.restaurantName ?? "");
  if (!restaurant) return;

  const matchesItem = parsed.items.some((item) => {
    const itemName = normalizeName(item.name);
    return itemName.length > 0 && (itemName === restaurant || restaurant.includes(itemName) || itemName.includes(restaurant));
  });

  if (matchesItem) {
    console.log(
      `Vision: cleared restaurantName "${parsed.restaurantName}" (matched a line item)`
    );
    parsed.restaurantName = "";
  }
}

export async function parseBillFromImage(imagePath: string) {
  if (!isVisionConfigured()) {
    const keyName =
      config.visionProvider === "nvidia"
        ? "NVIDIA_API_KEY"
        : "OPENROUTER_API_KEY";
    throw new Error(`${keyName} is required for vision parsing`);
  }

  const dataUrl = await readImageDataUrl(imagePath);
  const model = getActiveVisionModel();

  console.log(
    `[VisionParser] ⏱️ Sending receipt image to ${getModelTag()}...`
  );
  const startTime = Date.now();

  let data: { choices?: Array<{ message?: { content?: string } }> };
  let usedTag = getModelTag();

  try {
    data =
      config.visionProvider === "nvidia"
        ? await callNvidiaVision(dataUrl, model)
        : await callOpenRouterVision(dataUrl, model);
  } catch (primaryErr) {
    // If NVIDIA fails or times out, fall back to OpenRouter (gpt-4o-mini)
    if (config.visionProvider === "nvidia" && config.openRouterApiKey) {
      console.warn(
        `[VisionParser] NVIDIA failed (${primaryErr instanceof Error ? primaryErr.message : primaryErr}). Falling back to OpenRouter ${config.openRouterVisionModel}...`
      );
      usedTag = `openrouter/${config.openRouterVisionModel}`;
      data = await callOpenRouterVision(dataUrl, config.openRouterVisionModel);
    } else {
      throw primaryErr;
    }
  }

  const durationMs = Date.now() - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Vision API returned empty response");
  }

  const json = parseJsonFromModelContent(content);
  const parsed = ParsedBillSchema.parse(json);
  sanitizeRestaurantName(parsed);
  console.log(
    `Vision parse OK (${usedTag}): ${parsed.items.length} items extracted in ⏱️ ${durationSec}s (${durationMs}ms)`
  );
  for (const item of parsed.items) {
    console.log(
      `  · ${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.name} → ₹${item.price}`
    );
  }
  if (parsed.tax > 0) {
    console.log(`  · tax ₹${parsed.tax}, total ₹${parsed.grandTotal ?? "?"}`);
  }
  return parsed;
}
