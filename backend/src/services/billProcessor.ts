import { Bill, IBill } from "../models/Bill";
import { runOcr, deleteTempFile } from "./ocr";
import { saveOcrDebug } from "./ocrDebug";
import { parseBillFromOcr, parseBillLocal } from "./parser";
import { isVisionSupportedImage, parseBillFromImage } from "./visionParser";
import { config, isVisionConfigured } from "../config";
import type { ParsedBill } from "@zaptab/shared";
import { reconcileBill } from "../utils/reconciliation";

function applyParsedBill(bill: IBill, parsed: ParsedBill, ocrText?: string) {
  const recon = reconcileBill(parsed);

  bill.restaurantName = parsed.restaurantName;
  bill.billDate = parsed.billDate;
  bill.items.splice(
    0,
    bill.items.length,
    ...parsed.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }))
  );
  bill.subtotal = parsed.subtotal ?? recon.receiptSubtotal;
  bill.tax = parsed.tax ?? recon.totalTax;
  bill.serviceCharge = parsed.serviceCharge ?? recon.serviceCharge;
  bill.cgst = parsed.cgst;
  bill.sgst = parsed.sgst;
  bill.vat = parsed.vat;
  bill.otherTax = parsed.otherTax;
  bill.discount = parsed.discount;
  bill.tip = parsed.tip;
  bill.grandTotal = parsed.grandTotal ?? recon.calculatedGrandTotal;
  bill.receiptSubtotal = parsed.receiptSubtotal ?? parsed.subtotal;
  bill.calculatedItemSubtotal = recon.calculatedItemSubtotal;
  bill.printedBillTotal = parsed.printedBillTotal ?? parsed.grandTotal;
  bill.roundedPayableTotal = parsed.roundedPayableTotal;
  bill.isItemSubtotalValid = recon.isItemSubtotalValid;
  bill.requiresVerification = recon.requiresVerification;
  bill.validationWarnings = recon.validationWarnings;
  if (ocrText !== undefined) bill.ocrText = ocrText;
  bill.status = "parsed";
  bill.errorMessage = undefined;

  console.log(`[BillProcessor] Processed bill ${bill._id}:`);
  console.log(`  · item count: ${parsed.items.length}`);
  console.log(`  · calculated item subtotal: ₹${recon.calculatedItemSubtotal.toFixed(2)}`);
  console.log(`  · receipt subtotal: ₹${recon.receiptSubtotal.toFixed(2)}`);
  console.log(
    `  · difference: ₹${Math.abs(recon.receiptSubtotal - recon.calculatedItemSubtotal).toFixed(2)}`
  );
  console.log(
    `  · validation status: ${
      recon.isItemSubtotalValid ? "VALID ✅" : "REQUIRES VERIFICATION ⚠️"
    }`
  );
  if (recon.validationWarnings.length > 0) {
    for (const w of recon.validationWarnings) {
      console.warn(`    ⚠️ ${w}`);
    }
  }
}

export async function processBill(billId: string): Promise<void> {
  const bill = await Bill.findById(billId);
  if (!bill || !bill.tempFilePath) {
    return;
  }

  bill.status = "processing";
  await bill.save();

  const filePath = bill.tempFilePath;

  try {
    let parsed: ParsedBill | null = null;
    let ocrText = "";
    let visionError: unknown;

    // 1) Vision: send image to configured provider (NVIDIA or OpenRouter)
    if (
      config.parserMode === "vision" &&
      isVisionConfigured() &&
      isVisionSupportedImage(filePath)
    ) {
      try {
        parsed = await parseBillFromImage(filePath);
      } catch (error) {
        visionError = error;
        console.warn(
          "Vision parse failed:",
          error instanceof Error ? error.message : error
        );
      }
    }

    if (!parsed && config.parserMode === "vision") {
      if (!isVisionConfigured()) {
        const keyName =
          config.visionProvider === "nvidia"
            ? "NVIDIA_API_KEY"
            : "OPENROUTER_API_KEY";
        throw new Error(`${keyName} is required for vision parsing`);
      }

      if (!isVisionSupportedImage(filePath)) {
        throw new Error("Vision parsing supports JPG, PNG, and WEBP receipts. Please upload an image instead of a PDF.");
      }

      throw visionError instanceof Error
        ? visionError
        : new Error("Vision parsing failed");
    }

    // 2) Fallback modes: Tesseract OCR + local/OpenRouter text parser
    if (!parsed) {
      ocrText = await runOcr(filePath);
      await saveOcrDebug(bill._id.toString(), ocrText);
      parsed =
        config.parserMode === "openrouter" && config.openRouterApiKey
          ? await parseBillFromOcr(ocrText)
          : parseBillLocal(ocrText);
    }

    applyParsedBill(bill, parsed, ocrText || undefined);

    bill.imagePath = filePath;
    bill.tempFilePath = undefined;
    bill.tempFileExpiresAt = undefined;
    await bill.save();
  } catch (error) {
    bill.status = "failed";
    bill.errorMessage =
      error instanceof Error ? error.message : "Bill processing failed";
    await bill.save();
  }
}

export function serializeBill(bill: IBill) {
  const calculatedItemsTotal = bill.items.reduce((s, i) => s + i.price, 0);

  return {
    id: bill._id.toString(),
    restaurantName: bill.restaurantName,
    billDate: bill.billDate,
    items: bill.items.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    subtotal: bill.subtotal,
    tax: bill.tax,
    serviceCharge: bill.serviceCharge,
    cgst: bill.cgst ?? 0,
    sgst: bill.sgst ?? 0,
    vat: bill.vat ?? 0,
    otherTax: bill.otherTax ?? 0,
    discount: bill.discount ?? 0,
    tip: bill.tip ?? 0,
    grandTotal: bill.grandTotal,
    receiptSubtotal: bill.receiptSubtotal ?? bill.subtotal,
    calculatedItemSubtotal: bill.calculatedItemSubtotal ?? calculatedItemsTotal,
    printedBillTotal: bill.printedBillTotal ?? bill.grandTotal,
    roundedPayableTotal: bill.roundedPayableTotal,
    isItemSubtotalValid: bill.isItemSubtotalValid ?? true,
    requiresVerification: bill.requiresVerification ?? false,
    validationWarnings: bill.validationWarnings ?? [],
    hasImage: Boolean(bill.imagePath || bill.tempFilePath),
    imageUrl: (bill.imagePath || bill.tempFilePath)
      ? `/bills/${bill._id.toString()}/image`
      : undefined,
    status: bill.status,
    errorMessage: bill.errorMessage,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
  };
}
