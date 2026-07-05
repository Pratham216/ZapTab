import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import InputField from "../components/InputField";
import { colors, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "JoinCode">;

export default function JoinCodeScreen({ navigation }: Props) {
  const [code, setCode] = useState("");

  function handleContinue() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    navigation.navigate("Join", { code: trimmed });
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={typography.kicker}>Join</Text>
        <Text style={[typography.heading, styles.title]}>Enter room code</Text>
        <Text style={typography.body}>
          Ask the host for the 6-character code from their screen.
        </Text>
      </View>

      <InputField
        label="Room code"
        value={code}
        onChangeText={setCode}
        placeholder="ABC123"
        style={styles.field}
      />

      <Button
        label="Continue"
        fullWidth
        disabled={!code.trim()}
        onPress={handleContinue}
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
  field: {
    marginBottom: spacing.xl,
  },
  backBtn: {
    marginTop: spacing.sm,
  },
});
