import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

function truncateId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

type Props = NativeStackScreenProps<RootStackParamList, "Status">;

export default function StatusScreen({ navigation }: Props) {
  const { session, apiUrl, backendOk, refresh } = useAuth();

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={typography.kicker}>Developer</Text>
        <Text style={[typography.heading, styles.title]}>Connection status</Text>
      </View>

      <Card>
        <Row label="Backend" value={backendOk ? "Connected" : "Unknown"} />
        <View style={styles.divider} />
        <Row label="API URL" value={apiUrl} />
        <View style={styles.divider} />
        <Row label="Guest ID" value={session ? truncateId(session.guestId) : "—"} />
      </Card>

      <View style={styles.actions}>
        <Button
          label="Refresh session"
          variant="secondary"
          fullWidth
          onPress={() => void refresh()}
        />
        <Button
          label="Back"
          variant="ghost"
          fullWidth
          onPress={() => navigation.goBack()}
        />
      </View>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.sm,
  },
  row: {
    gap: spacing.xs,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
