import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isValidUpiId } from "@splitsnap/shared";
import { updateUserUpi, getCurrentUser } from "../api/users";
import { setCachedUser, useAuthSync } from "../hooks/useAuthSync";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  useAuthSync();
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    retry: 1,
  });

  useEffect(() => {
    if (user?.hasUpi) {
      navigate("/app", { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = upiId.trim();
    if (!trimmed) {
      setError("Enter your UPI ID so friends can pay you");
      return;
    }
    if (!isValidUpiId(trimmed)) {
      setError("Use format: name@bank (e.g. you@ybl)");
      return;
    }

    setSaving(true);
    try {
      const user = await updateUserUpi(trimmed);
      setCachedUser(user);
      queryClient.setQueryData(["current-user"], user);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save UPI ID");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-300">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            One last step
          </p>
          <h1 className="font-serif text-4xl text-white">
            Where should friends pay you?
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            {clerkUser?.firstName
              ? `Hey ${clerkUser.firstName}, add`
              : "Add"}{" "}
            your UPI ID once. We&apos;ll use it every time you host a bill.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs text-neutral-500 uppercase tracking-wider">
              UPI ID
            </span>
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 transition-colors"
              placeholder="you@ybl"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              autoFocus
            />
          </label>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-lg btn-primary disabled:opacity-50"
          >
            {saving ? "Saving..." : "Continue to SplitSnap"}
          </button>
        </form>

        <p className="text-center text-xs text-neutral-600">
          Your UPI ID is only shared with people in your bill rooms.
        </p>
      </div>
    </div>
  );
}
