import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "../components/TabBar";
import ScanSheet from "../components/ScanSheet";
import BillsScreen from "../screens/BillsScreen";
import JoinTabScreen from "../screens/JoinTabScreen";
import RoomsScreen from "../screens/RoomsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { ScanProvider } from "../contexts/ScanContext";
import { useScanBill } from "../hooks/useScanBill";
import { colors } from "../theme";
import type { RootStackParamList } from "./AppNavigator";

export type TabParamList = {
  Bills: undefined;
  Join: undefined;
  Scan: undefined;
  Rooms: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function ScanPlaceholder() {
  return <View />;
}

export default function TabNavigator() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scan = useScanBill(navigation);

  return (
    <ScanProvider openScan={scan.openSheet}>
      <Tab.Navigator
        tabBar={(props) => (
          <TabBar {...props} onScanPress={scan.openSheet} />
        )}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tab.Screen
          name="Bills"
          component={BillsScreen}
          options={{
            tabBarLabel: "Bills",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "receipt" : "receipt-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Join"
          component={JoinTabScreen}
          options={{
            tabBarLabel: "Join",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Scan"
          component={ScanPlaceholder}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              scan.openSheet();
            },
          }}
          options={{
            tabBarLabel: () => null,
            tabBarButton: () => null,
          }}
        />
        <Tab.Screen
          name="Rooms"
          component={RoomsScreen}
          options={{
            tabBarLabel: "Rooms",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>

      <ScanSheet
        visible={scan.sheetVisible}
        uploading={scan.uploading}
        error={scan.error}
        onClose={scan.closeSheet}
        onTakePhoto={scan.takePhoto}
        onChooseLibrary={scan.chooseFromLibrary}
      />
    </ScanProvider>
  );
}
