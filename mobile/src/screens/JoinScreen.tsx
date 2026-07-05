import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import InputField from "../components/InputField";
import { joinRoom } from "../api/rooms";
import { createGuestSession } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Join">;

export default function JoinScreen({ navigation, route }: Props) {
  const { code } = route.params;
  const { reloadSession } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await createGuestSession();
      await reloadSession();
      await joinRoom(code, name.trim());
      navigation.replace("Room", { code: code.toUpperCase() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={typography.kicker}>Join</Text>
        <Text style={[typography.heading, styles.title]}>Join the bill</Text>
        <Text style={styles.code}>
          Room code: <Text style={styles.codeValue}>{code.toUpperCase()}</Text>
        </Text>
      </View>

      <InputField
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Rahul"
        style={styles.field}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Join room"
        fullWidth
        loading={loading}
        disabled={loading || !name.trim()}
        onPress={handleJoin}
      />
      <Button
        label="Back"
        variant="ghost"
        fullWidth
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.xs,
  },
  code: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  codeValue: {
    color: colors.gold,
    fontFamily: "monospace",
  },
  field: {
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  backBtn: {
    marginTop: spacing.sm,
  },
});
