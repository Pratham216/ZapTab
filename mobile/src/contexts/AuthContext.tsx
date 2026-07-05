import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearGuestSession,
  createGuestSession,
  ensureGuestSession,
  getStoredSession,
  type GuestSession,
} from "../lib/auth";
import { checkHealth, getAuthMe } from "../lib/api";
import { getApiUrl } from "../lib/config";

type BootstrapStatus = "loading" | "ready" | "error";

interface AuthContextValue {
  status: BootstrapStatus;
  session: GuestSession | null;
  apiUrl: string;
  backendOk: boolean | null;
  error: string | null;
  refresh: () => Promise<void>;
  reloadSession: () => Promise<void>;
  resetSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BootstrapStatus>("loading");
  const [session, setSession] = useState<GuestSession | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const health = await checkHealth();
      setBackendOk(health.status === "ok");

      const guestSession = await ensureGuestSession();
      await getAuthMe();
      setSession(guestSession);
      setStatus("ready");
    } catch (err) {
      setBackendOk(false);
      setSession(null);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  }, []);

  const reloadSession = useCallback(async () => {
    const stored = await getStoredSession();
    if (stored) setSession(stored);
  }, []);

  const resetSession = useCallback(async () => {
    await clearGuestSession();
    const fresh = await createGuestSession();
    await getAuthMe();
    setSession(fresh);
    setStatus("ready");
    setError(null);
    setBackendOk(true);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const value = useMemo(
    () => ({
      status,
      session,
      apiUrl: getApiUrl(),
      backendOk,
      error,
      refresh: bootstrap,
      reloadSession,
      resetSession,
    }),
    [status, session, backendOk, error, bootstrap, reloadSession, resetSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
