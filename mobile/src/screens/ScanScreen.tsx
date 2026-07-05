import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import { uploadBillImage } from "../api/bills";
import { colors, fontSize, radius, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Scan">;

export default function ScanScreen({ navigation }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickedAsset(asset: ImagePicker.ImagePickerAsset) {
    setUploading(true);
    setError(null);

    try {
      const { id } = await uploadBillImage(asset);
      navigation.replace("BillReview", { billId: id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera permission needed",
        "Allow camera access to scan your bill."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!result.canceled) {
      await handlePickedAsset(result.assets[0]);
    }
  }

  async function openGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo permission needed",
        "Allow photo access to upload a receipt."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!result.canceled) {
      await handlePickedAsset(result.assets[0]);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={typography.kicker}>Step 1</Text>
        <Text style={[typography.heading, styles.title]}>Scan a bill</Text>
      </View>

      <View style={styles.placeholder}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>+</Text>
        </View>
        <Text style={styles.placeholderTitle}>Upload a clear receipt</Text>
        <Text style={styles.placeholderBody}>
          Take a fresh photo or choose one from your gallery. We'll extract the
          items, tax, and total automatically.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Button
        label="Take photo"
        fullWidth
        loading={uploading}
        disabled={uploading}
        onPress={openCamera}
      />
      <Button
        label="Choose from gallery"
        variant="secondary"
        fullWidth
        disabled={uploading}
        onPress={openGallery}
        style={styles.secondaryButton}
      />
      <Button
        label="Back"
        variant="ghost"
        fullWidth
        disabled={uploading}
        onPress={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  title: {
    marginTop: spacing.sm,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  icon: {
    color: colors.gold,
    fontSize: 42,
    fontWeight: "200",
  },
  placeholderTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "600",
    textAlign: "center",
  },
  placeholderBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});
