const TOKEN_KEY = "zaptab_token";
const GUEST_ID_KEY = "zaptab_guest_id";
const USER_TOKEN_KEY = "zaptab_user_token";
const USER_GUEST_ID_KEY = "zaptab_user_guest_id";

function guestStorage(): Storage {
  return sessionStorage;
}

function userStorage(): Storage {
  return localStorage;
}

export function getToken(): string | null {
  const userToken = userStorage().getItem(USER_TOKEN_KEY);
  if (userToken) return userToken;
  return guestStorage().getItem(TOKEN_KEY);
}

export function getGuestId(): string | null {
  const userGuestId = userStorage().getItem(USER_GUEST_ID_KEY);
  if (userGuestId) return userGuestId;
  return guestStorage().getItem(GUEST_ID_KEY);
}

export function setGuestSession(token: string, guestId: string) {
  guestStorage().setItem(TOKEN_KEY, token);
  guestStorage().setItem(GUEST_ID_KEY, guestId);
}

export function setUserSession(token: string, guestId: string) {
  userStorage().setItem(USER_TOKEN_KEY, token);
  userStorage().setItem(USER_GUEST_ID_KEY, guestId);
}

export function clearUserSession() {
  userStorage().removeItem(USER_TOKEN_KEY);
  userStorage().removeItem(USER_GUEST_ID_KEY);
}

export function clearGuestSession() {
  guestStorage().removeItem(TOKEN_KEY);
  guestStorage().removeItem(GUEST_ID_KEY);
}

export function clearSession() {
  clearGuestSession();
  clearUserSession();
}

export function isUserSession(): boolean {
  return !!userStorage().getItem(USER_TOKEN_KEY);
}

export async function ensureGuestSession(): Promise<string> {
  const existing = guestStorage().getItem(TOKEN_KEY);
  if (existing) return existing;

  return createFreshGuestSession();
}

export async function resolveApiToken(preferGuest = false): Promise<string> {
  if (!preferGuest) {
    const userToken = userStorage().getItem(USER_TOKEN_KEY);
    if (userToken) return userToken;
  }
  return ensureGuestSession();
}

/** New guest identity — use when joining so each person/tab is separate */
export async function createFreshGuestSession(): Promise<string> {
  const res = await fetch("/api/auth/guest", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create guest session");
  const data = (await res.json()) as { token: string; guestId: string };
  setGuestSession(data.token, data.guestId);
  return data.token;
}
