import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import SplitSnapWordmark from "../components/SplitSnapWordmark";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, radius, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

const STEPS = [
  {
    num: "01",
    title: "Scan the bill",
    body: "Snap a photo of any receipt. We read every line item in seconds.",
  },
  {
    num: "02",
    title: "Tap what you ate",
    body: "Friends join with a link and check off their own items.",
  },
  {
    num: "03",
    title: "Pay your share",
    body: "Everyone sees exactly what they owe. Settle up over UPI.",
  },
];

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  const { status, backendOk, error, refresh } = useAuth();

  if (status === "loading") {
    return (
      <ScreenContainer center>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[typography.body, styles.loadingText]}>
          Starting your session…
        </Text>
      </ScreenContainer>
    );
  }

  if (status === "error") {
    return (
      <ScreenContainer center>
        <Text style={typography.heading}>Can't reach the server</Text>
        <Text style={[typography.body, styles.errorText]}>{error}</Text>
        <Button label="Try again" onPress={refresh} style={styles.retryBtn} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.hero}>
        <SplitSnapWordmark size="lg" style={styles.wordmark} />
        <Text style={[typography.title, styles.heroTitle]}>
          Scan.{"\n"}Split.{"\n"}
          <Text style={styles.heroAccent}>Settle up.</Text>
        </Text>
        <Text style={[typography.body, styles.heroBody]}>
          Split any restaurant bill in under a minute. No spreadsheets, no
          awkward math at the table.
        </Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step) => (
          <View key={step.num} style={styles.step}>
            <Text style={styles.stepNum}>{step.num}</Text>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Scan a bill"
          fullWidth
          onPress={() => navigation.navigate("Scan")}
        />
        <Button
          label="Join with a code"
          variant="secondary"
          fullWidth
          onPress={() => navigation.navigate("JoinCode")}
          style={styles.secondaryBtn}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.statusDot}>
          <View
            style={[
              styles.dot,
              { backgroundColor: backendOk ? colors.success : colors.textMuted },
            ]}
          />
          <Text style={styles.footerText}>
            {backendOk ? "Connected" : "Offline"}
          </Text>
        </View>
        <Text
          style={styles.footerLink}
          onPress={() => navigation.navigate("Status")}
        >
          Developer info
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  wordmark: {
    marginBottom: spacing.xs,
  },
  heroTitle: {
    marginTop: spacing.lg,
  },
  heroAccent: {
    color: colors.textMuted,
  },
  heroBody: {
    marginTop: spacing.lg,
    maxWidth: 320,
  },
  steps: {
    gap: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  step: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "flex-start",
  },
  stepNum: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontVariant: ["tabular-nums"],
    width: 28,
    paddingTop: 2,
  },
  stepText: {
    flex: 1,
    gap: spacing.xs,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  stepBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  secondaryBtn: {
    marginTop: spacing.xs,
  },
  loadingText: {
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  retryBtn: {
    minWidth: 160,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  footerLink: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textDecorationLine: "underline",
  },
});
