import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearAllSessions,
  clearUserSession,
  getStoredUserSession,
  setUserSession,
  type GuestSession,
} from "../lib/auth";
import { checkHealth } from "../lib/api";
import { getApiUrl } from "../lib/config";
import { setHistoryScope } from "../lib/history";
import { disconnectSocket } from "../hooks/useSocket";
import {
  getCurrentUser,
  loginWithPassword,
  registerWithPassword,
  type AppUser,
} from "../api/users";

export type AuthPhase =
  | "loading"
  | "sign_in"
  | "syncing"
  | "onboarding"
  | "ready"
  | "error";

interface AuthContextValue {
  phase: AuthPhase;
  session: GuestSession | null;
  user: AppUser | null;
  apiUrl: string;
  backendOk: boolean | null;
  error: string | null;
  refresh: () => Promise<void>;
  reloadSession: () => Promise<void>;
  completeOnboarding: (user: AppUser) => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    name: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>("loading");
  const [session, setSession] = useState<GuestSession | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bootstrappingRef = useRef(false);

  // Log every phase transition
  const setPhaseLogged = useCallback((next: AuthPhase) => {
    console.log("[AuthContext] Phase →", next);
    setPhase(next);
  }, []);

  const applySession = useCallback(async (token: string, guestId: string) => {
    console.log("[AuthContext] applySession — saving session, guestId:", guestId);
    await setUserSession(token, guestId);
    setSession({ token, guestId });

    console.log("[AuthContext] applySession — checking backend health");
    const health = await checkHealth();
    const ok = health.status === "ok";
    console.log("[AuthContext] applySession — backendOk:", ok);
    setBackendOk(ok);

    console.log("[AuthContext] applySession — fetching current user");
    const nextUser = await getCurrentUser();
    setHistoryScope(nextUser.id);
    setUser(nextUser);

    const nextPhase = nextUser.hasUpi ? "ready" : "onboarding";
    console.log("[AuthContext] applySession — user loaded, hasUpi:", nextUser.hasUpi, "→ phase:", nextPhase);
    setPhaseLogged(nextPhase);
  }, [setPhaseLogged]);

  const bootstrap = useCallback(async () => {
    if (bootstrappingRef.current) {
      console.log("[AuthContext] bootstrap — already in progress, skipping");
      return;
    }
    bootstrappingRef.current = true;
    setError(null);
    console.log("[AuthContext] bootstrap — starting, apiUrl:", getApiUrl());

    try {
      console.log("[AuthContext] bootstrap — checking stored user session");
      const stored = await getStoredUserSession();
      if (!stored) {
        console.log("[AuthContext] bootstrap — no stored session, showing sign_in");
        setSession(null);
        setUser(null);
        setHistoryScope(null);
        setPhaseLogged("sign_in");
        return;
      }

      console.log("[AuthContext] bootstrap — found stored session, syncing");
      setPhaseLogged("syncing");
      setSession(stored);

      console.log("[AuthContext] bootstrap — health check");
      const health = await checkHealth();
      const ok = health.status === "ok";
      console.log("[AuthContext] bootstrap — backendOk:", ok);
      setBackendOk(ok);

      console.log("[AuthContext] bootstrap — fetching current user");
      const nextUser = await getCurrentUser();
      setHistoryScope(nextUser.id);
      setUser(nextUser);

      const nextPhase = nextUser.hasUpi ? "ready" : "onboarding";
      console.log("[AuthContext] bootstrap — done, hasUpi:", nextUser.hasUpi, "→ phase:", nextPhase);
      setPhaseLogged(nextPhase);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Session expired. Sign in again.";
      console.error("[AuthContext] bootstrap — error:", message, err);
      await clearUserSession();
      setSession(null);
      setUser(null);
      setHistoryScope(null);
      setBackendOk(false);
      setPhaseLogged("sign_in");
      setError(message);
    } finally {
      bootstrappingRef.current = false;
    }
  }, [setPhaseLogged]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const reloadSession = useCallback(async () => {
    console.log("[AuthContext] reloadSession");
    const stored = await getStoredUserSession();
    setSession(stored);
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      console.log("[AuthContext] signInWithPassword — start for:", email);
      setPhaseLogged("syncing");
      setError(null);
      try {
        const result = await loginWithPassword(email, password);
        console.log("[AuthContext] signInWithPassword — login OK, applying session");
        await applySession(result.token, result.guestId);
        console.log("[AuthContext] signInWithPassword — done ✓");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to sign in";
        console.error("[AuthContext] signInWithPassword — failed:", message);
        setPhaseLogged("sign_in");
        setError(message);
        throw err;
      }
    },
    [applySession, setPhaseLogged]
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string, name: string) => {
      console.log("[AuthContext] signUpWithPassword — start for:", email, "name:", name);
      setPhaseLogged("syncing");
      setError(null);
      try {
        const result = await registerWithPassword(email, password, name);
        console.log("[AuthContext] signUpWithPassword — register OK, applying session");
        await applySession(result.token, result.guestId);
        console.log("[AuthContext] signUpWithPassword — done ✓");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to sign up";
        console.error("[AuthContext] signUpWithPassword — failed:", message);
        setPhaseLogged("sign_in");
        setError(message);
        throw err;
      }
    },
    [applySession, setPhaseLogged]
  );

  const completeOnboarding = useCallback((nextUser: AppUser) => {
    console.log("[AuthContext] completeOnboarding — user:", nextUser.email);
    setUser(nextUser);
    setPhaseLogged("ready");
  }, [setPhaseLogged]);

  const signOut = useCallback(async () => {
    console.log("[AuthContext] signOut — clearing all sessions");
    disconnectSocket();
    await clearAllSessions();
    setHistoryScope(null);
    setSession(null);
    setUser(null);
    setError(null);
    setPhaseLogged("sign_in");
    console.log("[AuthContext] signOut — done");
  }, [setPhaseLogged]);

  const value = useMemo(
    () => ({
      phase,
      session,
      user,
      apiUrl: getApiUrl(),
      backendOk,
      error,
      refresh: bootstrap,
      reloadSession,
      completeOnboarding,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [
      phase,
      session,
      user,
      backendOk,
      error,
      bootstrap,
      reloadSession,
      completeOnboarding,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    ]
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
