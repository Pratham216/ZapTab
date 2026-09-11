import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinRoom } from "../api/rooms";
import { createFreshGuestSession } from "../lib/auth";
import { trackEvent } from "../lib/analytics";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name.trim()) return;

    setError(null);
    setLoading(true);
    try {
      await createFreshGuestSession();
      await joinRoom(code, name.trim());
      trackEvent("room_joined", { code: code.toUpperCase(), guestName: name.trim() });
      navigate(`/room/${code.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-7">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Join the bill</h2>
        <p className="text-neutral-400 mt-2">
          Room code:{" "}
          <span className="font-mono text-amber-400 font-medium">{code}</span>
        </p>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-neutral-400">Your name</span>
          <input
            className="w-full input-field"
            placeholder="e.g. Rahul"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="btn-primary w-full py-2.5 text-sm"
        >
          {loading ? "Joining..." : "Join room"}
        </button>
      </form>
    </div>
  );
}
