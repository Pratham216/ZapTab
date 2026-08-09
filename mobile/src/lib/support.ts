import { Alert, Linking, Platform } from "react-native";
import Constants from "expo-constants";

export const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || "hello@zaptab.app";

export const SUPPORT_SUBJECT = "ZapTab feedback";

export function buildSupportMessage(user?: {
  name?: string;
  email?: string;
}) {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const userLine = user?.email
    ? `\nAccount: ${user.name?.trim() || "ZapTab user"} (${user.email})`
    : "";

  return `Hi ZapTab team,\n\n[Your message here]\n\n---\nZapTab v${version} · ${Platform.OS}${userLine}`;
}

function buildMailtoUrl(subject: string, body: string) {
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
}

function openMailtoOnWeb(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function openSupportInMailApp(message: string) {
  const url = buildMailtoUrl(SUPPORT_SUBJECT, message);

  if (Platform.OS === "web") {
    openMailtoOnWeb(url);
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // Fall through.
  }

  Alert.alert(
    "Email ZapTab",
    `Write to ${SUPPORT_EMAIL} and we'll get back to you.`,
    [{ text: "OK" }],
  );
}

export function formatSupportClipboard(message: string) {
  return `To: ${SUPPORT_EMAIL}\nSubject: ${SUPPORT_SUBJECT}\n\n${message}`;
}
