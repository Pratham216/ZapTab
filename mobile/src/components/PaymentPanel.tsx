import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { isValidUpiId } from "@zaptab/shared";
import Button from "./Button";
import Card from "./Card";
import InputField from "./InputField";
import { markSelfPaid, updateHostUpi, type Room } from "../api/rooms";
import {
  buildPaymentUpiUrl,
  getMyShare,
  getParticipantShare,
} from "../lib/payments";
import { colors, fontSize, spacing } from "../theme";

interface PaymentPanelProps {
  room: Room;
  myGuestId: string | null;
  isHost: boolean;
  onRoomUpdated: (room: Room) => void;
}

export default function PaymentPanel({
  room,
  myGuestId,
  isHost,
  onRoomUpdated,
}: PaymentPanelProps) {
  const [marking, setMarking] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);
  const [hostUpiDraft, setHostUpiDraft] = useState(room.hostUpiId ?? "");
  const [error, setError] = useState<string | null>(null);

  const myShare = getMyShare(room, myGuestId);
  const myParticipant = room.participants.find((p) => p.guestId === myGuestId);
  const isPaid = myParticipant?.paid ?? false;
  const amount = myShare?.total ?? 0;
  const hasHostUpi = !!room.hostUpiId && isValidUpiId(room.hostUpiId);
  const upiUrl = hasHostUpi && amount > 0 ? buildPaymentUpiUrl(room, amount) : null;

  async function handleMarkPaid() {
    setError(null);
    setMarking(true);
    try {
      const updated = await markSelfPaid(room.code);
      onRoomUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setMarking(false);
    }
  }

  async function handleSaveUpi() {
    setError(null);
    setSavingUpi(true);
    try {
      const updated = await updateHostUpi(room.code, hostUpiDraft);
      onRoomUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save UPI ID");
    } finally {
      setSavingUpi(false);
    }
  }

  async function handlePayWithUpi() {
    if (!upiUrl) return;
    const canOpen = await Linking.canOpenURL(upiUrl);
    if (!canOpen) {
      setError("No UPI app found on this device");
      return;
    }
    await Linking.openURL(upiUrl);
  }

  if (isHost) {
    const guests = room.participants.filter((p) => p.guestId !== room.hostGuestId);

    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Host payments</Text>
        <InputField
          label="Your UPI ID"
          value={hostUpiDraft}
          onChangeText={setHostUpiDraft}
          placeholder="you@ybl"
        />
        <Button
          label="Save UPI ID"
          variant="secondary"
          loading={savingUpi}
          disabled={savingUpi}
          onPress={handleSaveUpi}
        />

        {guests.length > 0 ? (
          <View style={styles.guestList}>
            {guests.map((p) => {
              const share = getParticipantShare(room, p.guestId);
              return (
                <View key={p.id} style={styles.guestRow}>
                  <Text style={styles.guestName}>{p.name}</Text>
                  <View style={styles.guestMeta}>
                    {share && share.total > 0 ? (
                      <Text
                        style={[
                          styles.guestAmount,
                          p.paid ? styles.guestAmountPaid : styles.guestAmountUnpaid,
                        ]}
                      >
                        ₹{share.total.toFixed(0)}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.statusBadge,
                        p.paid ? styles.statusBadgePaid : styles.statusBadgePending,
                      ]}
                    >
                      {p.paid ? "Paid" : "Pending"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.hint}>Friends will appear here once they join.</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>
    );
  }

  if (!myShare || amount <= 0) {
    return (
      <Card>
        <Text style={styles.hint}>Select what you had to see your share and pay.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.payCard}>
      <View style={styles.oweRow}>
        <View>
          <Text style={styles.oweLabel}>You owe</Text>
          <Text style={styles.oweValue}>₹{amount.toFixed(2)}</Text>
        </View>
        {isPaid ? <Text style={styles.paidBadgeDone}>Marked paid</Text> : null}
      </View>

      {!hasHostUpi ? (
        <Text style={styles.warning}>Host hasn't added a UPI ID yet.</Text>
      ) : isPaid ? (
        <View style={styles.paidMessage}>
          <Text style={styles.paidMessageTitle}>You're all set!</Text>
          <Text style={styles.paidMessageBody}>Thanks for settling up</Text>
        </View>
      ) : (
        <View style={styles.payActions}>
          <Button label="Pay with UPI" fullWidth shimmer onPress={handlePayWithUpi} />
          <Button
            label="I've paid"
            variant="secondary"
            fullWidth
            loading={marking}
            disabled={marking}
            onPress={handleMarkPaid}
          />
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  guestList: {
    gap: spacing.sm,
  },
  guestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  guestName: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
  },
  guestMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  guestAmount: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  guestAmountUnpaid: {
    color: colors.danger,
  },
  guestAmountPaid: {
    color: colors.success,
  },
  statusBadge: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgePending: {
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  statusBadgePaid: {
    color: colors.success,
    backgroundColor: colors.successMutedStrong,
    borderColor: colors.successBorder,
  },
  paidBadgeDone: {
    color: colors.success,
    backgroundColor: colors.successMutedStrong,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  payCard: {
    backgroundColor: colors.successMuted,
    borderColor: colors.successBorder,
    gap: spacing.md,
  },
  oweRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  oweLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  oweValue: {
    color: colors.gold,
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  warning: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  payActions: {
    gap: spacing.sm,
  },
  paidMessage: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  paidMessageTitle: {
    color: colors.gold,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textAlign: "center",
  },
  paidMessageBody: {
    color: colors.goldTextMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
});
