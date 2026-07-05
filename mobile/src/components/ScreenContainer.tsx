import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GridBackground from "./GridBackground";
import { colors, spacing } from "../theme";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  center?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function ScreenContainer({
  children,
  scroll = false,
  center = false,
  contentStyle,
}: ScreenContainerProps) {
  const inner = [
    styles.content,
    center && styles.center,
    contentStyle,
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <GridBackground />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[inner, styles.foreground]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  foreground: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    zIndex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
});
