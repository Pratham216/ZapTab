import { Bill, IBill } from "../models/Bill";
import { runOcr, deleteTempFile } from "./ocr";
import { saveOcrDebug } from "./ocrDebug";
import { parseBillFromOcr, parseBillLocal } from "./parser";
import { isVisionSupportedImage, parseBillFromImage } from "./visionParser";
import { config, isVisionConfigured } from "../config";
import type { ParsedBill } from "@zaptab/shared";

function applyParsedBill(bill: IBill, parsed: ParsedBill, ocrText?: string) {
  bill.restaurantName = parsed.restaurantName;
  bill.billDate = parsed.billDate;
  bill.items.splice(
    0,
    bill.items.length,
    ...parsed.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))
  );
  bill.subtotal = parsed.subtotal;
  bill.tax = parsed.tax;
  bill.serviceCharge = parsed.serviceCharge;
  bill.grandTotal = parsed.grandTotal;
  if (ocrText !== undefined) bill.ocrText = ocrText;
  bill.status = "parsed";
  bill.errorMessage = undefined;
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

    await deleteTempFile(filePath);
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
  return {
    id: bill._id.toString(),
    restaurantName: bill.restaurantName,
    billDate: bill.billDate,
    items: bill.items.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    subtotal: bill.subtotal,
    tax: bill.tax,
    serviceCharge: bill.serviceCharge,
    grandTotal: bill.grandTotal,
    status: bill.status,
    errorMessage: bill.errorMessage,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
  };
}
