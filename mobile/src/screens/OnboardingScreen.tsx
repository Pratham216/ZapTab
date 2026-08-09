import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { isValidUpiId } from "@zaptab/shared";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import GradientGoldText from "../components/GradientGoldText";
import { updateUserUpi } from "../api/users";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, radius, spacing } from "../theme";

export default function OnboardingScreen() {
  const { user, completeOnboarding } = useAuth();
  const [upiId, setUpiId] = useState(user?.upiId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.name?.split(" ")[0] || "there";

  function handleSkip() {
    if (!user) return;
    completeOnboarding(user);
  }

  async function handleSubmit() {
    if (!user) return;
    setError(null);
    const trimmed = upiId.trim();

    if (!trimmed) {
      completeOnboarding(user);
      return;
    }
    if (!isValidUpiId(trimmed)) {
      setError("Use format: name@bank (e.g. you@ybl)");
      return;
    }

    setSaving(true);
    try {
      const nextUser = await updateUserUpi(trimmed);
      completeOnboarding(nextUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save UPI ID");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer scroll contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>One last step</Text>
        <GradientGoldText size="title">Where should friends pay you?</GradientGoldText>
        <Text style={styles.subtitle}>
          Hey <Text style={styles.name}>{displayName}</Text>, add your UPI ID
          once (optional). We'll use it when you host a bill.
        </Text>
        {user?.email ? (
          <Text style={styles.accountLine}>
            Signed in as{" "}
            <Text style={styles.accountEmail}>{user.email}</Text>
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>UPI ID (optional)</Text>
        <TextInput
          style={styles.input}
          value={upiId}
          onChangeText={setUpiId}
          placeholder="you@ybl"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          selectionColor={colors.gold}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Continue to ZapTab"
          fullWidth
          shimmer
          loading={saving}
          disabled={saving}
          onPress={handleSubmit}
        />
        <Button
          label="Skip for now"
          fullWidth
          variant="ghost"
          disabled={saving}
          onPress={handleSkip}
        />
      </View>

      <Text style={styles.footer}>
        You can add your UPI ID later from Profile. It's only shared in
        your bill rooms.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "600",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  name: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  accountLine: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  accountEmail: {
    color: colors.gold,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
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
    fontSize: fontSize.md,
    fontFamily: "monospace",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  footer: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
