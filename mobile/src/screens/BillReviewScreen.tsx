import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import BillEditor from "../components/BillEditor";
import AnimatedEllipsis from "../components/AnimatedEllipsis";
import {
  getBill,
  getBillStatus,
  retryBill,
  type Bill,
} from "../api/bills";
import { getBillDisplayTotal } from "../lib/billTotals";
import { saveReceipt, saveRoom } from "../lib/history";
import { colors, fontSize, radius, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "BillReview">;

async function persistReceiptFromBill(bill: Bill, roomCode?: string, imageUri?: string) {
  await saveReceipt({
    billId: bill.id,
    restaurantName: bill.restaurantName,
    total: getBillDisplayTotal(bill),
    roomCode,
    imageUri,
  });
}

export default function BillReviewScreen({ navigation, route }: Props) {
  const { billId, focusSplit, imageUri } = route.params;
  const { user } = useAuth();
  const [bill, setBill] = useState<Bill | null>(null);
  const [status, setStatus] = useState<Bill["status"]>("processing");
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [roomCode, setRoomCode] = useState<string | undefined>();

  const handleBillChange = useCallback(
    async (next: Bill) => {
      setBill(next);
      await persistReceiptFromBill(next, roomCode, imageUri);
    },
    [roomCode, imageUri]
  );

  const loadBill = useCallback(async () => {
    const data = await getBill(billId);
    setBill(data);
    setStatus(data.status);
    setError(data.errorMessage ?? null);
  }, [billId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    let delayMs = 1500;

    async function poll() {
      try {
        const next = await getBillStatus(billId);
        if (cancelled) return;

        setStatus(next.status);
        setError(next.errorMessage ?? null);

        if (next.status === "parsed" || next.status === "failed") {
          const data = await getBill(billId);
          if (!cancelled) {
            setBill(data);
            if (data.status === "parsed") {
              await persistReceiptFromBill(data, undefined, imageUri);
            }
          }
          return;
        }

        timer = setTimeout(poll, delayMs);
        delayMs = Math.min(delayMs * 1.5, 10000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load bill");
        }
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [billId, loadBill]);

  useFocusEffect(
    useCallback(() => {
      if (status !== "parsed") return;
      void loadBill();
    }, [loadBill, status])
  );

  async function handleRetry() {
    setRetrying(true);
    setError(null);
    try {
      const next = await retryBill(billId);
      setStatus(next.status);
      setBill(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  if (status === "processing" || status === "uploading") {
    return (
      <ScreenContainer center>
        <View style={styles.processingCircle}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
        <Text style={[typography.heading, styles.centerTitle]}>
          Analyzing your bill
          <AnimatedEllipsis style={styles.ellipsis} />
        </Text>
        <Text style={[typography.body, styles.centerBody]}>
          We're reading the receipt and itemizing everything. This only takes a
          few seconds.
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScreenContainer>
    );
  }

  if (status === "failed" || bill?.status === "failed") {
    return (
      <ScreenContainer center>
        <Text style={[typography.heading, styles.centerTitle]}>
          Processing failed
        </Text>
        <Text style={[typography.body, styles.centerBody]}>
          {error || bill?.errorMessage || "Something went wrong while reading the bill."}
        </Text>
        <Button
          label="Retry"
          loading={retrying}
          disabled={retrying}
          onPress={handleRetry}
          style={styles.centerButton}
        />
        <Button label="Scan another" variant="ghost" onPress={() => navigation.navigate("Main")} />
      </ScreenContainer>
    );
  }

  if (!bill) {
    return (
      <ScreenContainer center>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenContainer>
    );
  }

  return (
    <BillEditor
      key={bill.id}
      initialBill={bill}
      focusSplit={focusSplit}
      defaultHostName={user?.name}
      defaultHostUpiId={user?.upiId}
      onBillChange={handleBillChange}
      onScanAnother={() => navigation.navigate("Main")}
      onRoomCreated={async (code) => {
        setRoomCode(code);
        const latest = await getBill(billId);
        setBill(latest);
        await persistReceiptFromBill(latest, code);
        await saveRoom({
          code,
          role: "host",
          restaurantName: latest.restaurantName,
        });
        navigation.replace("Room", { code });
      }}
    />
  );
}

const styles = StyleSheet.create({
  processingCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  centerTitle: {
    textAlign: "center",
  },
  ellipsis: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: "600",
  },
  centerBody: {
    marginTop: spacing.sm,
    maxWidth: 300,
    textAlign: "center",
  },
  centerButton: {
    marginTop: spacing.xl,
    minWidth: 160,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
