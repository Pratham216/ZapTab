import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/WelcomeScreen";
import ScanScreen from "../screens/ScanScreen";
import BillReviewScreen from "../screens/BillReviewScreen";
import RoomScreen from "../screens/RoomScreen";
import JoinCodeScreen from "../screens/JoinCodeScreen";
import JoinScreen from "../screens/JoinScreen";
import StatusScreen from "../screens/StatusScreen";
import { colors } from "../theme";

export type RootStackParamList = {
  Welcome: undefined;
  Scan: undefined;
  BillReview: { billId: string };
  Room: { code: string };
  JoinCode: undefined;
  Join: { code: string };
  Status: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="BillReview" component={BillReviewScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="JoinCode" component={JoinCodeScreen} />
        <Stack.Screen name="Join" component={JoinScreen} />
        <Stack.Screen name="Status" component={StatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
