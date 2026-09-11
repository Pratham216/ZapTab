import mongoose, { Schema, Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  /** Clerk user id, or `pwd:<email>` for local password accounts */
  clerkId: string;
  email: string;
  name: string;
  passwordHash?: string;
  participantGuestId: string;
  upiId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: "" },
    name: { type: String, default: "" },
    passwordHash: { type: String },
    participantGuestId: { type: String, required: true, unique: true },
    upiId: { type: String },
  },
  { timestamps: true }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string", $gt: "" } },
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
