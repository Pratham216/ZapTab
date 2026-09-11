import { Routes, Route } from "react-router-dom";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ScanPage from "./pages/ScanPage";
import BillPage from "./pages/BillPage";
import JoinPage from "./pages/JoinPage";
import RoomPage from "./pages/RoomPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import GuestLayout from "./components/GuestLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in" element={<AuthPage />} />
      <Route
        path="/sso-callback"
        element={<AuthenticateWithRedirectCallback />}
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ScanPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bill/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BillPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/join/:code"
        element={
          <GuestLayout>
            <JoinPage />
          </GuestLayout>
        }
      />
      <Route
        path="/room/:code"
        element={
          <GuestLayout>
            <RoomPage />
          </GuestLayout>
        }
      />
    </Routes>
  );
}
