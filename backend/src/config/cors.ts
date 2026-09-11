import { config } from "../config";

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const cleanOrigin = normalizeOrigin(origin);

  const configuredOrigins = (config.corsOrigin || "")
    .split(",")
    .map((o) => normalizeOrigin(o))
    .filter(Boolean);

  if (configuredOrigins.includes(cleanOrigin)) return true;
  if (cleanOrigin.endsWith(".netlify.app") || cleanOrigin.endsWith(".vercel.app")) return true;
  if (cleanOrigin.startsWith("http://localhost:")) return true;
  if (cleanOrigin.startsWith("http://127.0.0.1:")) return true;
  if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(cleanOrigin)) return true;
  if (/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(cleanOrigin)) return true;
  return false;
}

export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
};
