import { StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import ZapTabWordmark from "../components/ZapTabWordmark";
import ShimmerWelcomeText from "../components/ShimmerWelcomeText";
import AuthForm from "../components/AuthForm";
import { colors, fontSize, spacing } from "../theme";

export default function SignInScreen() {
  return (
    <ScreenContainer scroll contentStyle={styles.container}>
      <View style={styles.hero}>
        <ZapTabWordmark size="xl" />
        <ShimmerWelcomeText>Welcome to ZapTab</ShimmerWelcomeText>
        <Text style={styles.subtitle}>
          Sign in to scan bills, split with friends, and get paid over UPI.
        </Text>
      </View>
      <AuthForm />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
  },
});
