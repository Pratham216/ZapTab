import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Button from "./Button";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, radius, spacing } from "../theme";

type Mode = "sign_in" | "sign_up";

export default function AuthForm() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password");
      return;
    }
    if (mode === "sign_up" && !name.trim()) {
      setError("Enter your name");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (mode === "sign_in") {
        await signInWithPassword(email.trim(), password);
      } else {
        await signUpWithPassword(email.trim(), password, name.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
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
        loading={submitting}
        disabled={submitting}
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
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
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
