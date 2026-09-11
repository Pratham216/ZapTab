import { ParsedBillSchema } from "@zaptab/shared";
import { config } from "../config";

const PARSE_PROMPT = `You are a restaurant bill parser. Extract structured data from OCR text of a receipt.

Return ONLY valid JSON matching this schema:
{
  "restaurantName": "string",
  "billDate": "YYYY-MM-DD or empty string",
  "items": [{ "name": "string", "price": number, "quantity": number }],
  "subtotal": number or null,
  "tax": number,
  "serviceCharge": number,
  "grandTotal": number or null
}

Rules:
- Prices are in INR (₹). Extract numeric values only.
- If quantity is unclear, default to 1.
- Include food/drink items only in items array, not tax lines.
- tax = GST/VAT/tax total. serviceCharge = service charge if present.
- If a field is missing, use 0 for numbers and "" for strings.
- Do not include markdown or explanation, only JSON.`;

export async function parseBillFromOcr(ocrText: string) {
  if (config.parserMode === "openrouter" && config.openRouterApiKey) {
    return parseBillWithOpenRouter(ocrText);
  }

  return parseBillLocal(ocrText);
}

async function parseBillWithOpenRouter(ocrText: string) {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "ZapTab",
        },
        body: JSON.stringify({
          model: config.openRouterModel,
          max_tokens: config.openRouterMaxTokens,
          messages: [
            { role: "system", content: PARSE_PROMPT },
            { role: "user", content: `OCR TEXT:\n\n${truncateOcrText(ocrText)}` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      return parseBillLocal(ocrText);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return parseBillLocal(ocrText);
    }

    const json = JSON.parse(content);
    return ParsedBillSchema.parse(json);
  } catch {
    return parseBillLocal(ocrText);
  }
}

function truncateOcrText(text: string, maxChars = 3000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n...[truncated for API]";
}

function parseAmount(raw: string): number {
  let s = raw.trim().replace(/[^\d.,]/g, "");
  if (!s) return 0;

  // European decimal: 47,95 or 2.013,90
  if (/,\d{1,2}$/.test(s) && (s.match(/,/g)?.length ?? 0) === 1 && !/\d{3},/.test(s)) {
    return parseFloat(s.replace(",", "."));
  }

  // Thousands separator: 1,918.00
  return parseFloat(s.replace(/,/g, ""));
}

function cleanItemName(line: string): string {
  return line
    .replace(/^[^A-Za-z0-9(&]+/, "")
    .replace(/[:=|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTrailingAmount(line: string): number | null {
  const matches = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+[.,]\d{2})/g);
  if (!matches?.length) return null;
  return parseAmount(matches[matches.length - 1]);
}

function isItemNameLine(line: string): boolean {
  const cleaned = cleanItemName(line);
  if (cleaned.length < 4) return false;
  if (/^(qty|rate|amount|invoice|payment|sub\s*total|cgst|sgst|cgs|sgs|bill|bal|name|nam|payi)/i.test(cleaned)) {
    return false;
  }
  if (/sub\s*total|cgst|sgst|cgs|sgs|bill\s*total|payment|balance|rounded/i.test(line)) {
    return false;
  }
  if (/^\d+\s+\d/.test(line.trim())) return false;
  return /[a-zA-Z]{3,}/.test(cleaned);
}

function parseQtyRateAmount(line: string): { qty: number; rate: number; amount: number } | null {
  const m = line.trim().match(/^(\d+)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*$/);
  if (!m) return null;
  return {
    qty: parseInt(m[1], 10),
    rate: parseAmount(m[2]),
    amount: parseAmount(m[3]),
  };
}

function detectRestaurantName(lines: string[]): string {
  for (const line of lines.slice(0, 8)) {
    if (/grill|restaurant|kritunga|kitchen|cafe|biryani/i.test(line)) {
      const cleaned = cleanItemName(line);
      if (cleaned.length >= 3) return cleaned;
    }
  }
  return cleanItemName(lines[0] ?? "");
}

function detectBillDate(lines: string[]): string {
  for (const line of lines) {
    const dateColon = line.match(/DATE\s*:\s*(.+)/i);
    if (dateColon) return dateColon[1].trim();

    const dateInline = line.match(
      /(\d{1,2}[-/]\w{3}[-/]\d{4}|\w{3}\s+\d{1,2}\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i
    );
    if (dateInline) return dateInline[1].trim();
  }
  return "";
}

export function parseBillLocal(ocrText: string) {
  const lines = ocrText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items: Array<{ name: string; price: number; quantity: number }> = [];
  let pendingName = "";
  let subtotal: number | undefined;
  let tax = 0;
  let grandTotal = 0;

  const restaurantName = detectRestaurantName(lines);
  const billDate = detectBillDate(lines);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Sub total (anywhere in line)
    const subMatch = line.match(/sub\s*total\s*[:\s|]*([\d,.,]+)/i);
    if (subMatch) {
      subtotal = parseAmount(subMatch[1]);
      pendingName = "";
      continue;
    }

    // CGST / SGST (extract last amount on line)
    if (/\b(cgst|sgst|cgs|sgs)\b/i.test(line)) {
      const amt = extractTrailingAmount(line);
      if (amt !== null) tax += amt;
      pendingName = "";
      continue;
    }

    // Bill total (skip rounded duplicate)
    if (/bil[l]?\s*total/i.test(line) && !/rounded/i.test(line)) {
      const amt = extractTrailingAmount(line);
      if (amt !== null && amt > 100) grandTotal = amt;
      pendingName = "";
      continue;
    }

    // Qty + Rate + Amount (Leon Grill style): "2 160 320.00"
    const qra = parseQtyRateAmount(line);
    if (qra) {
      items.push({
        name: pendingName ? cleanItemName(pendingName) : "Item",
        quantity: qra.qty,
        price: qra.amount,
      });
      pendingName = "";
      continue;
    }

    // Jagavis style: "4 RAGI MUDDA (SANKATI) 440.00" (qty + name + line total)
    const qtyNamePrice = line.match(/^(\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/);
    if (qtyNamePrice) {
      const name = qtyNamePrice[2].trim();
      if (!/^(total|gross|net|cgst|sgst|gst|sub)/i.test(name)) {
        items.push({
          name,
          quantity: parseInt(qtyNamePrice[1], 10),
          price: parseAmount(qtyNamePrice[3]),
        });
        pendingName = "";
        continue;
      }
    }

    // Wrapped: "1 ITEM NAME" + next line "PART 349.00"
    const qtyNameOnly = line.match(/^(\d+)\s+(.+)$/);
    if (qtyNameOnly && !/\d+[.,]\d+\s*$/.test(line)) {
      const next = lines[i + 1];
      const nextPrice = next?.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/);
      if (nextPrice && !/total|gst|cgst|sgst/i.test(nextPrice[1])) {
        items.push({
          name: `${qtyNameOnly[2]} ${nextPrice[1]}`.trim(),
          quantity: parseInt(qtyNameOnly[1], 10),
          price: parseAmount(nextPrice[2]),
        });
        pendingName = "";
        i++;
        continue;
      }
    }

    // Item name line (waits for qty/rate/amount on next line)
    if (isItemNameLine(line)) {
      pendingName = cleanItemName(line);
      continue;
    }

    // Simple "name 123.45" fallback
    const priceMatch = line.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/);
    if (!priceMatch) continue;

    const name = cleanItemName(priceMatch[1]);
    const price = parseAmount(priceMatch[2]);

    if (/^net\s*amt/i.test(name)) {
      grandTotal = price;
      continue;
    }
    if (/^(total|grand|gross|qry|item|amount|ord\s*no|balance)/i.test(name)) continue;
    if (name.length < 3) continue;

    items.push({ name, price, quantity: 1 });
    pendingName = "";
  }

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + item.price, 0);
  }

  return ParsedBillSchema.parse({
    restaurantName,
    billDate,
    items,
    subtotal,
    tax,
    serviceCharge: 0,
    grandTotal: grandTotal || undefined,
  });
}
