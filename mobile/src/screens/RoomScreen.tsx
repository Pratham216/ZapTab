import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import Card from "../components/Card";
import QRDisplay from "../components/QRDisplay";
import ItemSelectionList from "../components/ItemSelectionList";
import PaymentPanel from "../components/PaymentPanel";
import {
  getRoom,
  leaveRoom,
  setItemSelection,
  type Room,
} from "../api/rooms";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { applySelectionChange } from "../lib/selections";
import { getParticipantShare } from "../lib/payments";
import { colors, fontSize, radius, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Room">;

export default function RoomScreen({ navigation, route }: Props) {
  const roomCode = route.params.code.toUpperCase();
  const { session } = useAuth();
  const myGuestId = session?.guestId ?? null;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const loadRoom = useCallback(async () => {
    try {
      const data = await getRoom(roomCode);
      setRoom(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Room not found");
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    loadRoom();
    const timer = setInterval(loadRoom, 30000);
    return () => clearInterval(timer);
  }, [loadRoom]);

  useSocket(roomCode, {
    onParticipantJoined: loadRoom,
    onParticipantLeft: loadRoom,
    onItemSelectionChanged: (data) => {
      if (data.guestId === myGuestId) return;
      setRoom((old) =>
        old ? applySelectionChange(old, data.itemId, data.guestId, data.quantity) : old
      );
    },
    onPaymentMarked: loadRoom,
    onUpiUpdated: (data) => {
      setRoom((old) => (old ? { ...old, hostUpiId: data.hostUpiId } : old));
    },
  });

  async function copyLink() {
    if (!room?.joinUrl) return;
    await Clipboard.setStringAsync(room.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    await leaveRoom(roomCode);
    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  }

  async function handleSetQuantity(itemId: string, quantity: number) {
    if (!myGuestId) return;

    setSelectionError(null);

    const previous = room;
    setRoom((old) =>
      old ? applySelectionChange(old, itemId, myGuestId, quantity) : old
    );
    setUpdatingItemId(itemId);

    try {
      const updated = await setItemSelection(roomCode, itemId, quantity);
      setRoom(updated);
    } catch (err) {
      if (previous) setRoom(previous);
      setSelectionError(
        err instanceof Error ? err.message : "Failed to update selection"
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  if (loading) {
    return (
      <ScreenContainer center>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenContainer>
    );
  }

  if (error || !room) {
    return (
      <ScreenContainer center>
        <Text style={typography.heading}>Room not found</Text>
        <Text style={[typography.body, styles.errorText]}>{error}</Text>
        <Button label="Go home" onPress={() => navigation.popToTop()} />
      </ScreenContainer>
    );
  }

  const bill = room.bill;
  const isHost = myGuestId === room.hostGuestId;

  return (
    <ScreenContainer scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={typography.kicker}>Room</Text>
          <Text style={[typography.heading, styles.title]}>
            {bill?.restaurantName || "Split room"}
          </Text>
          <Text style={styles.code}>
            Code: <Text style={styles.codeValue}>{room.code}</Text>
          </Text>
          {isHost ? (
            <View style={styles.hostBadgeWrap}>
              <Text style={styles.hostBadge}>Host</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Card style={styles.inviteCard}>
        <Text style={styles.sectionTitle}>Invite friends</Text>
        <QRDisplay url={room.joinUrl} />
        <Text style={styles.joinUrl}>{room.joinUrl}</Text>
        <Button
          label={copied ? "Link copied!" : "Copy invite link"}
          variant="copyLink"
          fullWidth
          onPress={copyLink}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>
          Participants ({room.participants.length})
        </Text>
        <View style={styles.participantList}>
          {room.participants.map((p) => {
            const isRoomHost = p.guestId === room.hostGuestId;
            const share = getParticipantShare(room, p.guestId);
            return (
              <View key={p.id} style={styles.participantRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {p.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.participantName}>{p.name}</Text>
                <View style={styles.participantMeta}>
                  {!isRoomHost && share && share.total > 0 ? (
                    <Text
                      style={[
                        styles.participantShare,
                        p.paid
                          ? styles.participantSharePaid
                          : styles.participantShareUnpaid,
                      ]}
                    >
                      ₹{share.total.toFixed(0)}
                    </Text>
                  ) : null}
                  {isRoomHost ? (
                    <Text style={styles.hostTag}>host</Text>
                  ) : p.paid ? (
                    <Text style={styles.paidTag}>Paid</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      {bill ? (
        <ItemSelectionList
          bill={bill}
          selections={room.selections ?? {}}
          participants={room.participants}
          myGuestId={myGuestId}
          onSetQuantity={handleSetQuantity}
          updatingItemId={updatingItemId}
        />
      ) : null}

      {selectionError ? (
        <Text style={styles.selectionError}>{selectionError}</Text>
      ) : null}

      <PaymentPanel
        room={room}
        myGuestId={myGuestId}
        isHost={isHost}
        onRoomUpdated={setRoom}
      />

      <View style={styles.footerActions}>
        <Button
          label="Leave room"
          variant="danger"
          onPress={handleLeave}
          style={styles.footerButton}
        />
        {bill ? (
          <Button
            label="Edit bill"
            variant="goldOutline"
            onPress={() => navigation.navigate("BillReview", { billId: bill.id })}
            style={styles.footerButton}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    marginTop: spacing.xs,
  },
  code: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  codeValue: {
    color: colors.gold,
    fontFamily: "monospace",
  },
  hostBadgeWrap: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  hostBadge: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    overflow: "hidden",
  },
  inviteCard: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
    alignSelf: "flex-start",
  },
  joinUrl: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
  participantList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  participantName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
  },
  participantMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  participantShare: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  participantShareUnpaid: {
    color: colors.danger,
  },
  participantSharePaid: {
    color: colors.success,
  },
  hostTag: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  paidTag: {
    color: colors.success,
    fontSize: fontSize.xs,
    backgroundColor: colors.successMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  selectionError: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginVertical: spacing.sm,
  },
  footerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  footerButton: {
    flex: 1,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    marginVertical: spacing.md,
  },
});
