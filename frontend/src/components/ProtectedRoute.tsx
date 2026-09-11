import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../api/users";
import { useAuthSync } from "../hooks/useAuthSync";
import { isUserSession } from "../lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireUpi?: boolean;
}

export default function ProtectedRoute({
  children,
  requireUpi = false,
}: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  useAuthSync();

  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: isLoaded && isSignedIn && isUserSession(),
    retry: 1,
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-300">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  if (isLoading && isUserSession()) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-300">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (requireUpi && user && !user.hasUpi) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
