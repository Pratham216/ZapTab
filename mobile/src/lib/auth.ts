import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./config";

import type { AppUser } from "../api/users";

const TOKEN_KEY = "zaptab_token";
const GUEST_ID_KEY = "zaptab_guest_id";
const USER_TOKEN_KEY = "zaptab_user_token";
const USER_GUEST_ID_KEY = "zaptab_user_guest_id";
const USER_PROFILE_KEY = "zaptab_user_profile";

export interface GuestSession {
  token: string;
  guestId: string;
}

export interface AppSession extends GuestSession {
  type: "guest" | "user";
}

export async function getStoredSession(): Promise<GuestSession | null> {
  const userSession = await getStoredUserSession();
  if (userSession) return userSession;

  const [token, guestId] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(GUEST_ID_KEY),
  ]);

  if (!token || !guestId) {
    console.log("[Auth] No guest session in storage");
    return null;
  }
  console.log("[Auth] Found guest session, guestId:", guestId);
  return { token, guestId };
}

export async function getStoredUserSession(): Promise<GuestSession | null> {
  const [token, guestId] = await Promise.all([
    AsyncStorage.getItem(USER_TOKEN_KEY),
    AsyncStorage.getItem(USER_GUEST_ID_KEY),
  ]);

  if (!token || !guestId) {
    console.log("[Auth] No user session in storage");
    return null;
  }
  console.log("[Auth] Found stored user session, guestId:", guestId);
  return { token, guestId };
}

export async function saveGuestSession(session: GuestSession): Promise<void> {
  console.log("[Auth] Saving guest session, guestId:", session.guestId);
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, session.token),
    AsyncStorage.setItem(GUEST_ID_KEY, session.guestId),
  ]);
}

export async function setUserSession(token: string, guestId: string): Promise<void> {
  console.log("[Auth] Persisting user session to storage, guestId:", guestId);
  await Promise.all([
    AsyncStorage.setItem(USER_TOKEN_KEY, token),
    AsyncStorage.setItem(USER_GUEST_ID_KEY, guestId),
  ]);
  console.log("[Auth] User session saved ✓");
}

export async function getStoredUserProfile(): Promise<AppUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch (e) {
    console.error("[Auth] Error parsing cached user profile:", e);
    return null;
  }
}

export async function saveStoredUserProfile(user: AppUser): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
    console.log("[Auth] Cached user profile saved ✓");
  } catch (e) {
    console.error("[Auth] Error saving user profile:", e);
  }
}

export async function clearUserProfile(): Promise<void> {
  await AsyncStorage.removeItem(USER_PROFILE_KEY);
}

export async function clearUserSession(): Promise<void> {
  console.log("[Auth] Clearing user session and profile from storage");
  await Promise.all([
    AsyncStorage.removeItem(USER_TOKEN_KEY),
    AsyncStorage.removeItem(USER_GUEST_ID_KEY),
    clearUserProfile(),
  ]);
}

export async function clearGuestSession(): Promise<void> {
  console.log("[Auth] Clearing guest session from storage");
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(GUEST_ID_KEY),
  ]);
}

export async function clearAllSessions(): Promise<void> {
  console.log("[Auth] Clearing ALL sessions from storage");
  await Promise.all([clearGuestSession(), clearUserSession()]);
}

export async function isUserSession(): Promise<boolean> {
  const session = await getStoredUserSession();
  return !!session;
}

export async function createGuestSession(): Promise<GuestSession> {
  const url = `${getApiUrl()}/auth/guest`;
  console.log("[Auth] Creating guest session →", url);
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    console.error("[Auth] Failed to create guest session, status:", res.status);
    throw new Error("Failed to create guest session");
  }

  const data = (await res.json()) as GuestSession;
  console.log("[Auth] Guest session created, guestId:", data.guestId);
  await saveGuestSession(data);
  return data;
}

export async function ensureGuestSession(): Promise<GuestSession> {
  const existing = await getStoredSession();
  if (existing) {
    console.log("[Auth] Reusing existing session");
    return existing;
  }
  console.log("[Auth] No session found, creating guest session");
  return createGuestSession();
}

export async function resolveApiToken(): Promise<string> {
  const userSession = await getStoredUserSession();
  if (userSession) {
    console.log("[Auth] Resolved token: user session");
    return userSession.token;
  }
  console.log("[Auth] No user session, resolving guest token");
  const guest = await ensureGuestSession();
  return guest.token;
}
