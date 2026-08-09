import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/contexts/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
