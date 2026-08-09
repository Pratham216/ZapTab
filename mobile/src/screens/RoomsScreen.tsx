import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import MobileHeader from "../components/MobileHeader";
import { getRecentRooms, removeRoom, type RoomEntry } from "../lib/history";
import { colors, fontSize, radius, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function RoomsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRooms(await getRecentRooms());
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScreenContainer contentStyle={styles.container} edges={["top"]}>
      <MobileHeader
        title="Your Rooms"
        subtitle="recent bill splits"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="grid-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No rooms yet</Text>
          <Text style={styles.emptyBody}>
            Host a bill or join with a code — your active splits show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
          contentContainerStyle={styles.list}
        >
          {rooms.map((room) => (
            <Pressable
              key={room.code}
              onPress={() => navigation.navigate("Room", { code: room.code })}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardLeft}>
                <View
                  style={[
                    styles.roleBadge,
                    room.role === "host" && styles.roleHost,
                  ]}
                >
                  <Text style={styles.roleText}>
                    {room.role === "host" ? "Host" : "Guest"}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.roomCode}>{room.code}</Text>
                  <Text style={styles.restaurant} numberOfLines={1}>
                    {room.restaurantName ?? "Bill split"}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.when}>{formatWhen(room.savedAt)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  Alert.alert(
                    "Remove room?",
                    "This removes it from your history. You can still rejoin with the code.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: async () => {
                          await removeRoom(room.code);
                          await load();
                        },
                      },
                    ]
                  );
                }}
                hitSlop={8}
                style={styles.remove}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardPressed: {
    opacity: 0.9,
    backgroundColor: colors.surfaceElevated,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleHost: {
    backgroundColor: colors.goldMuted,
    borderColor: colors.goldBorder,
  },
  roleText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  roomCode: {
    color: colors.gold,
    fontSize: fontSize.md,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  restaurant: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  when: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  remove: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
  },
});
