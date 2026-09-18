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
  getStoredUserProfile,
  getStoredUserSession,
  saveStoredUserProfile,
  setUserSession,
  type GuestSession,
} from "../lib/auth";
import { checkHealth } from "../lib/api";
import { getApiUrl } from "../lib/config";
import { setHistoryScope } from "../lib/history";
import { disconnectSocket } from "../hooks/useSocket";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import {
  getCurrentUser,
  loginWithPassword,
  registerWithPassword,
  syncClerkUser,
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

  const applySession = useCallback(
    async (token: string, guestId: string, preloadedUser?: AppUser) => {
      console.log("[AuthContext] applySession — saving session, guestId:", guestId);
      await setUserSession(token, guestId);
      setSession({ token, guestId });

      if (preloadedUser) {
        await saveStoredUserProfile(preloadedUser);
        setHistoryScope(preloadedUser.id);
        setUser(preloadedUser);
        const nextPhase = preloadedUser.hasUpi ? "ready" : "onboarding";
        console.log(
          "[AuthContext] applySession — using preloaded user, hasUpi:",
          preloadedUser.hasUpi,
          "→ phase:",
          nextPhase
        );
        setPhaseLogged(nextPhase);

        checkHealth()
          .then((h) => setBackendOk(h.status === "ok"))
          .catch((err) => console.warn("[AuthContext] health check failed:", err));
        return;
      }

      console.log("[AuthContext] applySession — fetching current user");
      const [health, nextUser] = await Promise.all([
        checkHealth().catch(() => ({ status: "error" })),
        getCurrentUser(),
      ]);
      setBackendOk(health.status === "ok");
      await saveStoredUserProfile(nextUser);
      setHistoryScope(nextUser.id);
      setUser(nextUser);

      const nextPhase = nextUser.hasUpi ? "ready" : "onboarding";
      console.log(
        "[AuthContext] applySession — user loaded, hasUpi:",
        nextUser.hasUpi,
        "→ phase:",
        nextPhase
      );
      setPhaseLogged(nextPhase);
    },
    [setPhaseLogged]
  );

  const {
    isLoaded: isClerkLoaded,
    isSignedIn: isClerkSignedIn,
    sessionId: clerkSessionId,
    getToken: getClerkToken,
    signOut: clerkSignOut,
  } = useClerkAuth();

  const getTokenRef = useRef(getClerkToken);
  getTokenRef.current = getClerkToken;

  const syncedSessionIdRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const syncWithClerk = useCallback(
    async (targetSessionId?: string | null) => {
      if (syncingRef.current) {
        console.log("[AuthContext] syncWithClerk — already in progress, skipping");
        return;
      }
      syncingRef.current = true;
      setError(null);
      console.log("[AuthContext] syncWithClerk — starting");

      try {
        // Optimistic fast-path if cached profile already exists
        const [stored, cachedUser] = await Promise.all([
          getStoredUserSession(),
          getStoredUserProfile(),
        ]);

        if (stored && cachedUser) {
          console.log("[AuthContext] syncWithClerk — using cached profile:", cachedUser.email);
          setSession(stored);
          setHistoryScope(cachedUser.id);
          setUser(cachedUser);
          setPhaseLogged(cachedUser.hasUpi ? "ready" : "onboarding");
        } else {
          setPhaseLogged("syncing");
        }

        const clerkToken = await getTokenRef.current();
        if (!clerkToken) {
          console.warn("[AuthContext] syncWithClerk — clerk token is null");
          setPhaseLogged("sign_in");
          return;
        }

        console.log("[AuthContext] syncWithClerk — syncing with backend /auth/sync");
        const result = await syncClerkUser(clerkToken);
        await applySession(result.token, result.guestId, result.user);
        setBackendOk(true);
        syncedSessionIdRef.current = targetSessionId ?? "synced";
        console.log("[AuthContext] syncWithClerk — completed for:", result.user.email);
      } catch (err) {
        console.error("[AuthContext] syncWithClerk — failed:", err);
        syncedSessionIdRef.current = null;
        const message =
          err instanceof Error ? err.message : "Failed to sync account with server";
        setError(message);
        setPhaseLogged("error");
      } finally {
        syncingRef.current = false;
      }
    },
    [applySession, setPhaseLogged]
  );

  useEffect(() => {
    if (!isClerkLoaded) {
      setPhaseLogged("loading");
      return;
    }

    if (!isClerkSignedIn) {
      console.log("[AuthContext] Clerk says not signed in");
      syncedSessionIdRef.current = null;
      void (async () => {
        await clearUserSession();
        setSession(null);
        setUser(null);
        setHistoryScope(null);
        setPhaseLogged("sign_in");
      })();
      return;
    }

    // Clerk is signed in. Only sync if not already synced for this active session!
    const activeSessionKey = clerkSessionId || "active";
    if (syncedSessionIdRef.current === activeSessionKey) {
      return;
    }

    void syncWithClerk(activeSessionKey);
  }, [isClerkLoaded, isClerkSignedIn, clerkSessionId, syncWithClerk, setPhaseLogged]);

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
        await applySession(result.token, result.guestId, result.user);
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
      console.log(
        "[AuthContext] signUpWithPassword — start for:",
        email,
        "name:",
        name
      );
      setPhaseLogged("syncing");
      setError(null);
      try {
        const result = await registerWithPassword(email, password, name);
        console.log("[AuthContext] signUpWithPassword — register OK, applying session");
        await applySession(result.token, result.guestId, result.user);
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

  const completeOnboarding = useCallback(
    (nextUser: AppUser) => {
      console.log("[AuthContext] completeOnboarding — user:", nextUser.email);
      void saveStoredUserProfile(nextUser);
      setUser(nextUser);
      setPhaseLogged("ready");
    },
    [setPhaseLogged]
  );

  const signOut = useCallback(async () => {
    console.log("[AuthContext] signOut — clearing all sessions");
    syncedSessionIdRef.current = null;
    syncingRef.current = false;
    disconnectSocket();
    try {
      await clerkSignOut();
    } catch (clerkErr) {
      console.warn("[AuthContext] clerkSignOut error:", clerkErr);
    }
    await clearAllSessions();
    setHistoryScope(null);
    setSession(null);
    setUser(null);
    setError(null);
    setPhaseLogged("sign_in");
    console.log("[AuthContext] signOut — done");
  }, [clerkSignOut, setPhaseLogged]);

  const value = useMemo(
    () => ({
      phase,
      session,
      user,
      apiUrl: getApiUrl(),
      backendOk,
      error,
      refresh: syncWithClerk,
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
      syncWithClerk,
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
