import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, radius, spacing } from "../theme";
import { goldGlowShadow } from "../lib/platformStyles";

interface TabBarProps extends BottomTabBarProps {
  onScanPress: () => void;
}

const FAB_SIZE = 60;

export default function TabBar({
  state,
  descriptors,
  navigation,
  onScanPress,
}: TabBarProps) {
  const insets = useSafeAreaInsets();

  const leftRoutes = state.routes.filter(
    (r) => r.name === "Bills" || r.name === "Join"
  );
  const rightRoutes = state.routes.filter(
    (r) => r.name === "Rooms" || r.name === "Profile"
  );

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {leftRoutes.map((route) => (
            <TabItem
              key={route.key}
              route={route}
              index={state.routes.indexOf(route)}
              state={state}
              descriptor={descriptors[route.key]}
              navigation={navigation}
            />
          ))}
        </View>

        <View style={styles.fabSlot}>
          <Pressable
            onPress={onScanPress}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            accessibilityRole="button"
            accessibilityLabel="Scan a bill"
          >
            <View style={styles.fabRing}>
              <View style={styles.fabInner}>
                <Ionicons name="camera" size={28} color={colors.onGold} />
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.side}>
          {rightRoutes.map((route) => (
            <TabItem
              key={route.key}
              route={route}
              index={state.routes.indexOf(route)}
              state={state}
              descriptor={descriptors[route.key]}
              navigation={navigation}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  route,
  index,
  state,
  descriptor,
  navigation,
}: {
  route: BottomTabBarProps["state"]["routes"][number];
  index: number;
  state: BottomTabBarProps["state"];
  descriptor: BottomTabBarProps["descriptors"][string];
  navigation: BottomTabBarProps["navigation"];
}) {
  const { options } = descriptor;
  const isFocused = state.index === index;

  const label =
    typeof options.tabBarLabel === "string"
      ? options.tabBarLabel
      : options.title ?? route.name;

  const color = isFocused ? colors.gold : colors.textMuted;

  function onPress() {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }

  function onLongPress() {
    navigation.emit({
      type: "tabLongPress",
      target: route.key,
    });
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={options.tabBarAccessibilityLabel}
    >
      {options.tabBarIcon?.({
        focused: isFocused,
        color,
        size: 22,
      })}
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  fabSlot: {
    width: FAB_SIZE + spacing.lg,
    alignItems: "center",
    marginTop: -(FAB_SIZE / 2 + 4),
  },
  fab: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  fabRing: {
    width: FAB_SIZE + 6,
    height: FAB_SIZE + 6,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  fabInner: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    ...goldGlowShadow(),
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 64,
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: colors.gold,
    fontWeight: "600",
  },
});
