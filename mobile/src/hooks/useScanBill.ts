import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { uploadBillImage } from "../api/bills";
import { saveReceipt } from "../lib/history";
import type { RootStackParamList } from "../navigation/AppNavigator";

export function useScanBill(
  navigation: NativeStackNavigationProp<RootStackParamList>
) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSheet = useCallback(() => {
    setError(null);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    if (!uploading) setSheetVisible(false);
  }, [uploading]);

  async function handlePickedAsset(asset: ImagePicker.ImagePickerAsset) {
    setUploading(true);
    setError(null);

    try {
      const { id } = await uploadBillImage(asset);
      await saveReceipt({
        billId: id,
        restaurantName: "Receipt",
        imageUri: asset.uri,
      });
      setSheetVisible(false);
      navigation.navigate("BillReview", {
        billId: id,
        imageUri: asset.uri,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  async function takePhoto() {
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

  async function chooseFromLibrary() {
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

  return {
    sheetVisible,
    uploading,
    error,
    openSheet,
    closeSheet,
    takePhoto,
    chooseFromLibrary,
  };
}
