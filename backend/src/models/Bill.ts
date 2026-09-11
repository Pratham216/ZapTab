import mongoose, { Schema, Types } from "mongoose";
import type { BillStatus } from "@zaptab/shared";

export interface IBillItem extends Types.Subdocument {
  _id: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  unitPrice?: number;
}

export interface IBill {
  _id: Types.ObjectId;
  restaurantName: string;
  billDate: string;
  items: Types.DocumentArray<IBillItem>;
  subtotal?: number;
  tax: number;
  serviceCharge: number;
  cgst?: number;
  sgst?: number;
  vat?: number;
  otherTax?: number;
  discount?: number;
  tip?: number;
  grandTotal?: number;
  receiptSubtotal?: number;
  calculatedItemSubtotal?: number;
  printedBillTotal?: number;
  roundedPayableTotal?: number;
  isItemSubtotalValid?: boolean;
  requiresVerification?: boolean;
  validationWarnings?: string[];
  ocrText?: string;
  status: BillStatus;
  errorMessage?: string;
  tempFilePath?: string;
  tempFileExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const billItemSchema = new Schema<IBillItem>(
  {
    name: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, min: 0 },
  },
  { _id: true }
);

const billSchema = new Schema<IBill>(
  {
    restaurantName: { type: String, default: "" },
    billDate: { type: String, default: "" },
    items: [billItemSchema],
    subtotal: { type: Number },
    tax: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    otherTax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    grandTotal: { type: Number },
    receiptSubtotal: { type: Number },
    calculatedItemSubtotal: { type: Number },
    printedBillTotal: { type: Number },
    roundedPayableTotal: { type: Number },
    isItemSubtotalValid: { type: Boolean, default: true },
    requiresVerification: { type: Boolean, default: false },
    validationWarnings: { type: [String], default: [] },
    ocrText: { type: String },
    status: {
      type: String,
      enum: ["uploading", "processing", "parsed", "failed"],
      default: "uploading",
    },
    errorMessage: { type: String },
    tempFilePath: { type: String },
    tempFileExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export const Bill = mongoose.model<IBill>("Bill", billSchema);
