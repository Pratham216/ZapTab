import { z } from "zod";

export const BillItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative().optional(),
});

export const ParsedBillSchema = z.object({
  restaurantName: z.string().optional().default(""),
  billDate: z.string().optional().default(""),
  items: z.array(BillItemSchema).default([]),
  subtotal: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().default(0),
  serviceCharge: z.number().nonnegative().default(0),
  cgst: z.number().nonnegative().optional().default(0),
  sgst: z.number().nonnegative().optional().default(0),
  vat: z.number().nonnegative().optional().default(0),
  otherTax: z.number().nonnegative().optional().default(0),
  discount: z.number().nonnegative().optional().default(0),
  tip: z.number().nonnegative().optional().default(0),
  grandTotal: z.number().nonnegative().optional(),
  receiptSubtotal: z.number().nonnegative().optional(),
  calculatedItemSubtotal: z.number().nonnegative().optional(),
  printedBillTotal: z.number().nonnegative().optional(),
  roundedPayableTotal: z.number().nonnegative().optional(),
  isItemSubtotalValid: z.boolean().optional().default(true),
  requiresVerification: z.boolean().optional().default(false),
  validationWarnings: z.array(z.string()).optional().default([]),
});

export type BillItem = z.infer<typeof BillItemSchema>;
export type ParsedBill = z.infer<typeof ParsedBillSchema>;

export const BillStatusSchema = z.enum([
  "uploading",
  "processing",
  "parsed",
  "failed",
]);

export type BillStatus = z.infer<typeof BillStatusSchema>;
