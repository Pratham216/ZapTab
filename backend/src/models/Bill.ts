import mongoose, { Schema, Types } from "mongoose";
import type { BillStatus } from "@zaptab/shared";

export interface IBillItem extends Types.Subdocument {
  _id: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IBill {
  _id: Types.ObjectId;
  restaurantName: string;
  billDate: string;
  items: Types.DocumentArray<IBillItem>;
  subtotal?: number;
  tax: number;
  serviceCharge: number;
  grandTotal?: number;
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
    grandTotal: { type: Number },
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
