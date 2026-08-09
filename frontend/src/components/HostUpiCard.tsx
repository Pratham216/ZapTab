import { useState } from "react";
import { isValidUpiId } from "@zaptab/shared";
import { updateHostUpi } from "../api/rooms";

interface HostUpiCardProps {
  roomCode: string;
  hostUpiId: string;
  onUpdated: (hostUpiId: string) => void;
  variant?: "banner" | "inline";
}

export default function HostUpiCard({
  roomCode,
  hostUpiId,
  onUpdated,
  variant = "banner",
}: HostUpiCardProps) {
  const [upiId, setUpiId] = useState(hostUpiId);
  const [editing, setEditing] = useState(!hostUpiId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const trimmed = upiId.trim();
    if (trimmed && !isValidUpiId(trimmed)) {
      setError("Use format: name@bank (e.g. you@ybl)");
      return;
    }

    setSaving(true);
    try {
      const room = await updateHostUpi(roomCode, trimmed);
      onUpdated(room.hostUpiId);
      setUpiId(room.hostUpiId);
      setEditing(!room.hostUpiId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save UPI ID");
    } finally {
      setSaving(false);
    }
  }

  if (!editing && hostUpiId) {
    const shellClass =
      variant === "banner"
        ? "rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4"
        : "rounded-xl border border-neutral-800 bg-neutral-900/30 px-4 py-3";

    return (
      <div className={shellClass}>
        <p className="text-xs text-neutral-400 mb-1.5">Your UPI ID</p>
        <div className="flex items-center gap-3 min-w-0">
          <p className="font-mono text-amber-300 truncate flex-1 min-w-0">
            {hostUpiId}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15 hover:text-amber-200"
          >
            <svg
              className="h-3 w-3 shrink-0"
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Edit
          </button>
        </div>
      </div>
    );
  }

  const editShellClass =
    variant === "banner"
      ? "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
      : "rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 space-y-2.5";

  return (
    <div className={editShellClass}>
      <div>
        <h3 className="font-medium text-amber-200 text-sm">
          {hostUpiId ? "Update your UPI ID" : "Add your UPI ID so friends can pay you"}
        </h3>
        {!hostUpiId && (
          <p className="text-xs text-amber-200/70 mt-1">
            e.g. yourname@ybl, phone@paytm
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 input-field font-mono text-sm py-2"
          placeholder="yourname@ybl"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
        />
        <div className="flex gap-2 shrink-0">
          {hostUpiId && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setUpiId(hostUpiId);
                setError(null);
              }}
              className="btn-gold-outline px-3 py-2 text-sm"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-4 py-2 text-sm"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
