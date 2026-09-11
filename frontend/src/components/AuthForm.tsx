import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";
import { AppleIcon, GoogleIcon } from "./OAuthIcons";

type Mode = "sign_in" | "sign_up";
type AuthStep = "credentials" | "verify_email";

function clerkErrorMessage(err: unknown, mode: Mode = "sign_in"): string {
  if (isClerkAPIResponseError(err)) {
    const raw =
      err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Request failed";
    return friendlyAuthError(raw, mode);
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

const BOT_PROTECTION_HELP =
  "Clerk bot protection is still enabled. Open dashboard.clerk.com → Configure → Attack protection → turn OFF Bot sign-up protection, then refresh. Or use Google sign-in.";

function friendlyAuthError(message: string, mode: Mode): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("captcha") ||
    lower.includes("turnstile") ||
    lower.includes("missing captcha")
  ) {
    return BOT_PROTECTION_HELP;
  }
  if (
    lower.includes("already") &&
    (lower.includes("exists") || lower.includes("taken") || lower.includes("registered"))
  ) {
    return "This email is already registered. Sign in with Google or Apple instead.";
  }
  if (
    lower.includes("verification strategy is not valid") ||
    lower.includes("strategy is not valid")
  ) {
    return mode === "sign_in"
      ? "This email uses Google or Apple sign-in. Use those buttons above."
      : "This email is already registered. Try signing in with Google or Apple.";
  }
  if (lower.includes("identifier") && lower.includes("not found")) {
    return "No account found for this email. Sign up first or use Google/Apple.";
  }
  if (lower.includes("password") && lower.includes("incorrect")) {
    return "Incorrect password. Try again or use Google/Apple if you signed up that way.";
  }
  return message;
}

export default function AuthForm({
  initialMode = "sign_in",
}: {
  initialMode?: Mode;
}) {
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } =
    useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } =
    useSignUp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<AuthStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(
    null
  );

  const isLoaded = signInLoaded && signUpLoaded;
  const loading = busy || oauthLoading !== null;
  const verifyingEmail = step === "verify_email";

  async function handleOAuth(strategy: "oauth_google" | "oauth_apple") {
    if (!signIn) return;
    setError(null);
    setOauthLoading(strategy === "oauth_google" ? "google" : "apple");
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}/onboarding`,
      });
    } catch (err) {
      setError(clerkErrorMessage(err, "sign_in"));
      setOauthLoading(null);
    }
  }

  async function handleSignIn() {
    if (!signIn || !setSignInActive) return;
    setBusy(true);
    setError(null);
    try {
      await signIn.create({ identifier: email.trim(), password });
      const result = await signIn.attemptFirstFactor({
        strategy: "password",
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setSignInActive({ session: result.createdSessionId });
        navigate("/app");
        return;
      }

      setError("Sign in could not be completed. Check your email and password.");
    } catch (err) {
      setError(clerkErrorMessage(err, "sign_in"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    if (!signUp || !setSignUpActive) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: name.trim() || undefined,
      });

      if (signUp.status === "complete" && signUp.createdSessionId) {
        await setSignUpActive({ session: signUp.createdSessionId });
        navigate("/onboarding");
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify_email");
      setInfo(`Enter the 6-digit code sent to ${email.trim()}.`);
    } catch (err) {
      setError(clerkErrorMessage(err, "sign_up"));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyEmail() {
    if (!signUp || !setSignUpActive) return;
    if (!code.trim()) {
      setError("Enter the verification code from your email");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete" && signUp.createdSessionId) {
        await setSignUpActive({ session: signUp.createdSessionId });
        navigate("/onboarding");
        return;
      }

      setError("Invalid or expired code. Try again or resend a new code.");
    } catch (err) {
      setError(clerkErrorMessage(err, "sign_up"));
    } finally {
      setBusy(false);
    }
  }

  async function handleResendCode() {
    if (!signUp) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setInfo(`A new code was sent to ${email.trim()}.`);
    } catch (err) {
      setError(clerkErrorMessage(err, "sign_up"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    if (verifyingEmail) {
      await handleVerifyEmail();
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password");
      return;
    }
    if (mode === "sign_up" && !name.trim()) {
      setError("Enter your name");
      return;
    }
    if (mode === "sign_in") {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  }

  if (!isLoaded) {
    return (
      <div className="w-full max-w-sm card-premium auth-card-compact flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (verifyingEmail) {
    return (
      <div className="w-full max-w-sm card-premium auth-card-compact space-y-3">
        <div className="text-center space-y-1.5">
          <h2 className="text-lg font-semibold text-white">Verify your email</h2>
          <p className="text-sm text-neutral-400">
            {info ?? `Enter the code sent to ${email.trim()}.`}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-neutral-500 uppercase tracking-wider">
              Verification code
            </span>
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors tracking-widest"
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-400 text-center">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm btn-primary-shimmer disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Verify email"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleResendCode()}
            className="w-full text-sm text-amber-300 hover:text-amber-200"
          >
            Resend code
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setStep("credentials");
              setCode("");
              setError(null);
              setInfo(null);
            }}
            className="w-full text-sm text-neutral-500 hover:text-neutral-300"
          >
            ← Back
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm card-premium auth-card-compact">
      <div className="flex rounded-lg bg-neutral-900/80 p-1 border border-neutral-800">
        <button
          type="button"
          onClick={() => {
            setMode("sign_in");
            setError(null);
            setInfo(null);
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === "sign_in"
              ? "bg-amber-500/15 text-amber-300"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sign_up");
            setError(null);
            setInfo(null);
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === "sign_up"
              ? "bg-amber-500/15 text-amber-300"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Sign up
        </button>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleOAuth("oauth_google")}
        className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-900/80 text-neutral-100 text-sm font-semibold hover:border-neutral-500 transition-colors disabled:opacity-50"
      >
        {oauthLoading === "google" ? (
          <span className="w-5 h-5 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleOAuth("oauth_apple")}
        className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-100 text-sm font-semibold hover:border-neutral-500 transition-colors disabled:opacity-50"
      >
        {oauthLoading === "apple" ? (
          <span className="w-5 h-5 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
        ) : (
          <AppleIcon />
        )}
        Continue with Apple
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-neutral-800" />
        <span className="text-xs uppercase tracking-widest text-neutral-500">
          or
        </span>
        <div className="flex-1 h-px bg-neutral-800" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "sign_up" ? (
          <label className="block space-y-1.5">
            <span className="text-xs text-neutral-500 uppercase tracking-wider">
              Name
            </span>
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
              placeholder="Rahul"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-xs text-neutral-500 uppercase tracking-wider">
            Email
          </span>
          <input
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
            placeholder="you@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-neutral-500 uppercase tracking-wider">
            Password
          </span>
          <input
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "sign_in" ? "current-password" : "new-password"
            }
          />
        </label>

        {error ? (
          <p className="text-sm text-red-400 text-center">{error}</p>
        ) : null}

        {mode === "sign_up" ? (
          <button
            type="button"
            onClick={() => {
              setStep("verify_email");
              setInfo(
                `Enter the code sent to ${email.trim() || "your email"}.`
              );
            }}
            className="w-full text-sm text-amber-300 hover:text-amber-200"
          >
            Already have a verification code?
          </button>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 text-sm btn-primary-shimmer disabled:opacity-50"
        >
          {busy
            ? "Please wait…"
            : mode === "sign_in"
              ? "Continue"
              : "Create account"}
        </button>
      </form>
    </div>
  );
}
