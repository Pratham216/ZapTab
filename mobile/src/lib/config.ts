import Constants from "expo-constants";
import { Platform } from "react-native";

/** Deployed Render backend — used when EXPO_PUBLIC_API_URL is unset */
const PRODUCTION_API_URL = "https://splitsnap-wrrg.onrender.com";

function getLocalDevApiUrl(): string {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3001";
  }
  return "http://localhost:3001";
}

export function getApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra) return fromExtra.replace(/\/$/, "");

  return __DEV__ ? getLocalDevApiUrl() : PRODUCTION_API_URL;
}
