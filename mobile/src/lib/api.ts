import { ensureGuestSession } from "./auth";
import { getApiUrl } from "./config";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await ensureGuestSession();
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.token}`);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string" ? body.error : `Request failed: ${res.status}`
    );
  }

  return res.json();
}

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${getApiUrl()}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

export interface AuthMeResponse {
  guestId: string;
  type: "guest" | "user";
  userId?: string;
  clerkId?: string;
}

export async function getAuthMe(): Promise<AuthMeResponse> {
  return apiRequest<AuthMeResponse>("/auth/me");
}
