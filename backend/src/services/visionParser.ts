import fs from "fs/promises";
import path from "path";
import { ParsedBillSchema } from "@zaptab/shared";
import {
  config,
  getActiveVisionModel,
  isVisionConfigured,
} from "../config";

const VISION_PROMPT = `You are a restaurant bill parser. Read the receipt image and extract structured data.

Return ONLY valid JSON matching this schema:
{
  "restaurantName": "string",
  "billDate": "string (as shown on bill, or YYYY-MM-DD if clear)",
  "items": [{ "name": "string", "price": number, "quantity": number }],
  "subtotal": number or null,
  "tax": number,
  "serviceCharge": number,
  "grandTotal": number or null
}

Rules:
- Currency is INR (₹). Use numeric values only, no currency symbols.
- restaurantName: take it ONLY from the header/top area of the receipt (outlet/brand/store name, logo text, or address block). It never has a price or quantity next to it. If you cannot clearly identify it, return "" — do not guess.
- CRITICAL: any line that has a price and/or a quantity is a purchased item and MUST appear in "items". Never use such a line as restaurantName, and never drop it. The first item line is still an item, not the restaurant name.
- For each item: "quantity" = qty ordered; "price" = LINE TOTAL / Amount column (not per-unit rate).
  Example: Qty 2, Rate 799, Amount 1598 → { "name": "...", "quantity": 2, "price": 1598 }
- Example: "4 RAGI MUDDA 440.00" where 440 is line total → { "quantity": 4, "price": 440 }
- "tax" = total GST (CGST + SGST combined). serviceCharge = service charge if any, else 0.
- Include food/drink items only. Exclude tax lines, subtotals, payment info from items.
- Some receipts put the item NAME on one line and Qty / Rate / Amount on the NEXT line.
  Match each name to its following qty-rate-amount row. Do not skip items whose price is on a separate line.
- Read every visible line item from the image. Do not invent items or prices not on the receipt.
- The sum of all item prices should equal the printed subtotal. If it is short, you have missed an item — re-scan and include every priced line before answering.
- If a field is missing, use 0 for numbers and "" for strings.
- Return only JSON, no markdown.`;

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
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonText);
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

  const data =
    config.visionProvider === "nvidia"
      ? await callNvidiaVision(dataUrl, model)
      : await callOpenRouterVision(dataUrl, model);

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Vision API returned empty response");
  }

  const json = parseJsonFromModelContent(content);
  const parsed = ParsedBillSchema.parse(json);
  sanitizeRestaurantName(parsed);
  console.log(
    `Vision parse OK (${config.visionProvider}/${model}): ${parsed.items.length} items`
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
