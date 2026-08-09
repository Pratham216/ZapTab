import { resolveApiToken } from "./auth";
import { getApiUrl } from "./config";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await resolveApiToken();
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${getApiUrl()}${path}`;
  const method = options.method ?? "GET";
  console.log(`[API] ${method} ${url}`);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    console.error(`[API] Network error on ${method} ${url}:`, err);
    throw err;
  }

  console.log(`[API] ${method} ${url} → ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Request failed: ${res.status}`;
    console.error(`[API] Error body from ${method} ${url}:`, body);
    throw new Error(message);
  }

  const data = await res.json();
  console.log(`[API] Response from ${method} ${url}:`, data);
  return data as T;
}

export async function checkHealth(): Promise<{ status: string }> {
  const url = `${getApiUrl()}/health`;
  console.log("[API] Health check →", url);
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error("[API] Health check network error:", err);
    throw err;
  }
  console.log("[API] Health check status:", res.status);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  const data = await res.json();
  console.log("[API] Health check response:", data);
  return data;
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
