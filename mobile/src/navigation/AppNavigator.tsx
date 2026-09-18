import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import BillReviewScreen from "../screens/BillReviewScreen";
import RoomScreen from "../screens/RoomScreen";
import StatusScreen from "../screens/StatusScreen";
import SignInScreen from "../screens/SignInScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import Button from "../components/Button";
import ScreenContainer from "../components/ScreenContainer";
import AnimatedSplashScreen from "../components/AnimatedSplashScreen";
import { useAuth } from "../contexts/AuthContext";
import { colors, spacing, typography } from "../theme";

export type RootStackParamList = {
  Main: undefined;
  BillReview: { billId: string; focusSplit?: boolean; imageUri?: string };
  Room: { code: string };
  Status: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

function BootstrapLoading({ message }: { message?: string }) {
  return (
    <ScreenContainer center>
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={[typography.body, styles.loadingText]}>
        {message ?? "Connecting to ZapTab…"}
      </Text>
    </ScreenContainer>
  );
}

function BootstrapError({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <ScreenContainer center>
      <Text style={typography.heading}>Something went wrong</Text>
      <Text style={[typography.body, styles.errorText]}>{error}</Text>
      <Button label="Try again" onPress={onRetry} style={styles.retryBtn} />
    </ScreenContainer>
  );
}

function MainAppNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="BillReview" component={BillReviewScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Status" component={StatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  const { phase, error, refresh } = useAuth();
  const [splashVisible, setSplashVisible] = useState(true);

  const isReady = phase !== "loading" && phase !== "syncing";

  return (
    <View style={styles.rootContainer}>
      {phase === "loading" || phase === "syncing" ? (
        <BootstrapLoading
          message={phase === "syncing" ? "Syncing your account…" : undefined}
        />
      ) : phase === "sign_in" ? (
        <SignInScreen />
      ) : phase === "onboarding" ? (
        <OnboardingScreen />
      ) : phase === "error" ? (
        <BootstrapError error={error} onRetry={refresh} />
      ) : (
        <MainAppNavigator />
      )}

      {splashVisible && (
        <AnimatedSplashScreen
          isReady={isReady}
          onDismiss={() => setSplashVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
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
});
