import { StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors, radius } from "../theme";

interface QRDisplayProps {
  url: string;
  size?: number;
}

export default function QRDisplay({ url, size = 180 }: QRDisplayProps) {
  return (
    <View style={styles.wrap}>
      <QRCode value={url} size={size} backgroundColor="#ffffff" color="#000000" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#ffffff",
    borderRadius: radius.md,
    padding: 12,
    alignSelf: "center",
  },
});
