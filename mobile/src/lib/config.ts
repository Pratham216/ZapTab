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

let _loggedUrl: string | null = null;

export function getApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    const url = fromEnv.replace(/\/$/, "");
    if (_loggedUrl !== url) {
      _loggedUrl = url;
      console.log("[Config] API URL (from .env):", url);
    }
    return url;
  }

  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra) {
    const url = fromExtra.replace(/\/$/, "");
    if (_loggedUrl !== url) {
      _loggedUrl = url;
      console.log("[Config] API URL (from app.json extra):", url);
    }
    return url;
  }

  const fallback = __DEV__ ? getLocalDevApiUrl() : PRODUCTION_API_URL;
  if (_loggedUrl !== fallback) {
    _loggedUrl = fallback;
    console.warn(
      "[Config] EXPO_PUBLIC_API_URL not set — falling back to:",
      fallback,
      "| Platform:",
      Platform.OS,
      "| __DEV__:",
      __DEV__
    );
  }
  return fallback;
}
