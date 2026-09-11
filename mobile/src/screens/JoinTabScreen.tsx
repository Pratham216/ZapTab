import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenContainer from "../components/ScreenContainer";
import MobileHeader from "../components/MobileHeader";
import Button from "../components/Button";
import InputField from "../components/InputField";
import { joinRoom } from "../api/rooms";
import { saveRoom } from "../lib/history";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

export default function JoinTabScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [step, setStep] = useState<"code" | "name">("code");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCodeContinue() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setCode(trimmed);
    setStep("name");
    setError(null);
  }

  async function handleJoin() {
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { room } = await joinRoom(code, name.trim());
      await saveRoom({
        code: room.code,
        role: "guest",
        restaurantName: room.bill?.restaurantName,
      });
      navigation.navigate("Room", { code: room.code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer contentStyle={styles.container} edges={["top"]}>
      <MobileHeader
        title="Join a bill"
        subtitle="enter the room code from your host"
      />

      <View style={styles.card}>
        {step === "code" ? (
          <>
            <InputField
              label="Room code"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              placeholder="ABC123"
              style={styles.field}
            />
            <Button
              label="Continue"
              fullWidth
              disabled={!code.trim()}
              onPress={handleCodeContinue}
            />
          </>
        ) : (
          <>
            <Text style={styles.codeBadge}>
              Room <Text style={styles.codeValue}>{code}</Text>
            </Text>
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
              label="Change code"
              variant="ghost"
              fullWidth
              disabled={loading}
              onPress={() => {
                setStep("code");
                setError(null);
              }}
              style={styles.backBtn}
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  field: {
    marginBottom: spacing.sm,
  },
  codeBadge: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  codeValue: {
    color: colors.gold,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  backBtn: {
    marginTop: spacing.xs,
  },
});
