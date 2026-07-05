import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./config";

const TOKEN_KEY = "splitsnap_token";
const GUEST_ID_KEY = "splitsnap_guest_id";

export interface GuestSession {
  token: string;
  guestId: string;
}

export async function getStoredSession(): Promise<GuestSession | null> {
  const [token, guestId] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(GUEST_ID_KEY),
  ]);

  if (!token || !guestId) return null;
  return { token, guestId };
}

export async function saveGuestSession(session: GuestSession): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, session.token),
    AsyncStorage.setItem(GUEST_ID_KEY, session.guestId),
  ]);
}

export async function clearGuestSession(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(GUEST_ID_KEY),
  ]);
}

export async function createGuestSession(): Promise<GuestSession> {
  const res = await fetch(`${getApiUrl()}/auth/guest`, { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to create guest session");
  }

  const data = (await res.json()) as GuestSession;
  await saveGuestSession(data);
  return data;
}

export async function ensureGuestSession(): Promise<GuestSession> {
  const existing = await getStoredSession();
  if (existing) return existing;
  return createGuestSession();
}
