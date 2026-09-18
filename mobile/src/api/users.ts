import { getApiUrl } from "../lib/config";
import { apiRequest } from "../lib/api";

export interface AppUser {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  upiId: string;
  hasUpi: boolean;
}

export interface AuthSessionResponse {
  token: string;
  guestId: string;
  user: AppUser;
}

async function postAuth(
  path: "/auth/login" | "/auth/register",
  body: Record<string, string>
): Promise<AuthSessionResponse> {
  const url = `${getApiUrl()}${path}`;
  console.log(`[Users] POST ${path} with email:`, body.email);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`[Users] Network error on POST ${path}:`, err);
    throw err;
  }

  console.log(`[Users] POST ${path} → status ${res.status}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[Users] POST ${path} error response:`, data);
    throw new Error(
      typeof data.error === "string" ? data.error : "Authentication failed"
    );
  }

  console.log(`[Users] POST ${path} success, user:`, (data as AuthSessionResponse).user?.email);
  return data as AuthSessionResponse;
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<AuthSessionResponse> {
  console.log("[Users] loginWithPassword called for:", email);
  return postAuth("/auth/login", { email, password });
}

export async function registerWithPassword(
  email: string,
  password: string,
  name: string
): Promise<AuthSessionResponse> {
  console.log("[Users] registerWithPassword called for:", email, "name:", name);
  return postAuth("/auth/register", { email, password, name });
}

export async function syncClerkUser(clerkToken: string): Promise<AuthSessionResponse> {
  const url = `${getApiUrl()}/auth/sync`;
  console.log("[Users] syncClerkUser called");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("[Users] Network error on POST /auth/sync:", err);
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[Users] POST /auth/sync error response:", data);
    throw new Error(
      typeof data.error === "string" ? data.error : "Failed to sync account"
    );
  }

  console.log("[Users] syncClerkUser success, user:", (data as AuthSessionResponse).user?.email);
  return data as AuthSessionResponse;
}

export async function getCurrentUser(): Promise<AppUser> {
  console.log("[Users] getCurrentUser called");
  const user = await apiRequest<AppUser>("/users/me");
  console.log("[Users] getCurrentUser result:", user.email, "hasUpi:", user.hasUpi);
  return user;
}

export async function updateUserUpi(upiId: string): Promise<AppUser> {
  console.log("[Users] updateUserUpi called with:", upiId);
  return apiRequest<AppUser>("/users/me/upi", {
    method: "PATCH",
    body: JSON.stringify({ upiId }),
  });
}
