import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useSignIn,
  useSignUp,
  useOAuth,
  isClerkAPIResponseError,
} from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Button from "./Button";
import { GoogleIcon, AppleIcon } from "./OAuthIcons";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, radius, spacing } from "../theme";

WebBrowser.maybeCompleteAuthSession();

type Mode = "sign_in" | "sign_up";

function clerkErrorMessage(err: unknown, mode: Mode = "sign_in"): string {
  if (isClerkAPIResponseError(err)) {
    const raw =
      err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Request failed";
    return friendlyAuthError(raw, mode);
  }
  if (
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: Array<{ longMessage?: string; message?: string }> }).errors)
  ) {
    const first = (err as { errors: Array<{ longMessage?: string; message?: string }> }).errors[0];
    const raw = first?.longMessage ?? first?.message ?? "Request failed";
    return friendlyAuthError(raw, mode);
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

function friendlyAuthError(message: string, mode: Mode): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("already") &&
    (lower.includes("exists") || lower.includes("taken") || lower.includes("registered"))
  ) {
    return "This email is already registered. Try signing in instead.";
  }
  if (lower.includes("identifier") && lower.includes("not found")) {
    return "No account found for this email. Sign up first or use Google/Apple.";
  }
  if (lower.includes("password") && lower.includes("incorrect")) {
    return "Incorrect password. Try again or use Google/Apple if you signed up that way.";
  }
  return message;
}

export default function AuthForm() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: "oauth_apple" });

  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  const isLoaded = signInLoaded && signUpLoaded;
  const loading = busy || oauthLoading !== null;

  async function handleOAuth(strategy: "google" | "apple") {
    setError(null);
    setOauthLoading(strategy);
    try {
      const flow = strategy === "google" ? startGoogleFlow : startAppleFlow;
      const redirectUrl = Linking.createURL("oauth-callback", { scheme: "zaptab" });
      const { createdSessionId, setActive } = await flow({ redirectUrl });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("[AuthForm] OAuth error:", err);
      setError(clerkErrorMessage(err, mode));
    } finally {
      setOauthLoading(null);
    }
  }

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      // 1. Try Clerk sign in
      if (signIn && setSignInActive) {
        try {
          const result = await signIn.create({
            identifier: email.trim(),
            password,
          });

          if (result.status === "complete" && result.createdSessionId) {
            await setSignInActive({ session: result.createdSessionId });
            return;
          }

          const factorResult = await signIn.attemptFirstFactor({
            strategy: "password",
            password,
          });

          if (factorResult.status === "complete" && factorResult.createdSessionId) {
            await setSignInActive({ session: factorResult.createdSessionId });
            return;
          }
        } catch (clerkErr) {
          console.log("[AuthForm] Clerk signIn bypass/fallback to backend:", clerkErr);
        }
      }

      // 2. Direct backend login fallback
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(clerkErrorMessage(err, "sign_in"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    setBusy(true);
    setError(null);
    try {
      // 1. Try Clerk sign up if it can complete directly without OTP
      if (signUp && setSignUpActive) {
        try {
          const res = await signUp.create({
            emailAddress: email.trim(),
            password,
            firstName: name.trim() || undefined,
          });

          if (res.status === "complete" && res.createdSessionId) {
            await setSignUpActive({ session: res.createdSessionId });
            return;
          }
        } catch (clerkErr) {
          console.log("[AuthForm] Clerk direct sign up not complete, using instant backend registration:", clerkErr);
        }
      }

      // 2. Instant direct backend registration (no OTP!)
      await signUpWithPassword(email.trim(), password, name.trim());
    } catch (err) {
      setError(clerkErrorMessage(err, "sign_up"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!isLoaded) return;

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
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Mode Switch */}
      <View style={styles.tabs}>
        <Pressable
          onPress={() => {
            setMode("sign_in");
            setError(null);
          }}
          style={[styles.tab, mode === "sign_in" && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              mode === "sign_in" && styles.tabTextActive,
            ]}
          >
            Sign in
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode("sign_up");
            setError(null);
          }}
          style={[styles.tab, mode === "sign_up" && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              mode === "sign_up" && styles.tabTextActive,
            ]}
          >
            Sign up
          </Text>
        </Pressable>
      </View>

      {/* Social Login Buttons */}
      <Pressable
        onPress={() => void handleOAuth("google")}
        disabled={loading}
        style={({ pressed }) => [
          styles.socialBtn,
          pressed && styles.socialBtnPressed,
          loading && styles.disabledBtn,
        ]}
      >
        {oauthLoading === "google" ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <GoogleIcon size={18} />
        )}
        <Text style={styles.socialBtnText}>Continue with Google</Text>
      </Pressable>

      <Pressable
        onPress={() => void handleOAuth("apple")}
        disabled={loading}
        style={({ pressed }) => [
          styles.socialBtn,
          styles.appleBtn,
          pressed && styles.socialBtnPressed,
          loading && styles.disabledBtn,
        ]}
      >
        {oauthLoading === "apple" ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <AppleIcon size={18} />
        )}
        <Text style={styles.socialBtnText}>Continue with Apple</Text>
      </Pressable>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Input Fields */}
      {mode === "sign_up" ? (
        <AuthField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Rahul"
          autoCapitalize="words"
        />
      ) : null}

      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={mode === "sign_in" ? "Continue" : "Create account"}
        fullWidth
        shimmer
        loading={busy}
        disabled={loading}
        onPress={() => void handleSubmit()}
      />
    </View>
  );
}

function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "words";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        selectionColor={colors.gold}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    width: "100%",
    maxWidth: 340,
  },
  loadingCard: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.goldMuted,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.gold,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  appleBtn: {
    backgroundColor: "#000000",
  },
  socialBtnPressed: {
    opacity: 0.8,
  },
  socialBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.goldTextMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "500",
  },
  input: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    minHeight: 42,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
});
