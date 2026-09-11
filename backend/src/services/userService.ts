import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { isValidUpiId, normalizeUpiId } from "@zaptab/shared";
import { User, IUser } from "../models/User";

const PASSWORD_ROUNDS = 10;

export function serializeUser(user: IUser) {
  return {
    id: user._id.toString(),
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    upiId: user.upiId ?? "",
    hasUpi: !!user.upiId,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function localAuthId(email: string): string {
  return `pwd:${normalizeEmail(email)}`;
}

function assertValidCredentials(email: string, password: string, name?: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Enter a valid email address");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  if (name !== undefined && !name.trim()) {
    throw new Error("Enter your name");
  }
  return normalized;
}

export async function findOrCreateUserFromClerk(input: {
  clerkId: string;
  email: string;
  name: string;
}) {
  let user = await User.findOne({ clerkId: input.clerkId });
  if (user) {
    let changed = false;
    if (input.email && user.email !== input.email) {
      user.email = input.email;
      changed = true;
    }
    if (input.name && user.name !== input.name) {
      user.name = input.name;
      changed = true;
    }
    if (changed) await user.save();
    return user;
  }

  user = await User.create({
    clerkId: input.clerkId,
    email: input.email,
    name: input.name || "Host",
    participantGuestId: uuidv4(),
  });

  return user;
}

export async function registerUserWithPassword(input: {
  email: string;
  password: string;
  name: string;
}) {
  const email = assertValidCredentials(input.email, input.password, input.name);
  const clerkId = localAuthId(email);

  const existing = await User.findOne({
    $or: [{ email }, { clerkId }],
  });

  if (existing) {
    // Account already has a password — they should just sign in.
    if (existing.passwordHash) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }

    // Account was created via Clerk (OAuth) and has no password yet.
    // Upgrade it so this email can be used with password auth going forward.
    existing.passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);
    if (input.name.trim()) existing.name = input.name.trim();
    // Switch clerkId to local-auth format so login lookup works.
    existing.clerkId = clerkId;
    await existing.save();
    return existing;
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);
  const user = await User.create({
    clerkId,
    email,
    name: input.name.trim() || "Host",
    passwordHash,
    participantGuestId: uuidv4(),
  });

  return user;
}

export async function loginUserWithPassword(input: {
  email: string;
  password: string;
}) {
  const email = assertValidCredentials(input.email, input.password);
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("No account found for this email. Sign up first.");
  }

  if (!user.passwordHash) {
    // Account exists but was created via Clerk — no password set yet.
    throw new Error(
      "This account was set up without a password. Use Sign Up to add one."
    );
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new Error("Incorrect password");
  }

  return user;
}

export async function updateUserUpi(userId: string, upiId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const trimmed = upiId.trim();
  if (!trimmed) {
    user.upiId = undefined;
    await user.save();
    return user;
  }

  if (!isValidUpiId(trimmed)) {
    throw new Error("Invalid UPI ID. Use format: name@bank (e.g. you@ybl)");
  }

  user.upiId = normalizeUpiId(trimmed);
  await user.save();
  return user;
}

export async function getUserById(userId: string) {
  return User.findById(userId);
}
