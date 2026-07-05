import { useState } from "react";
import QRDisplay from "./QRDisplay";
import { markSelfPaid } from "../api/rooms";
import type { Room } from "../api/rooms";
import {
  buildPaymentUpiUrl,
  getMyShare,
  getParticipantShare,
  isMobileDevice,
} from "../lib/payments";

interface PaymentPanelProps {
  room: Room;
  myGuestId: string | null;
  isHost: boolean;
  onRoomUpdated: (room: Room) => void;
}

export default function PaymentPanel({
  room,
  myGuestId,
  isHost,
  onRoomUpdated,
}: PaymentPanelProps) {
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const myShare = getMyShare(room, myGuestId);
  const myParticipant = room.participants.find((p) => p.guestId === myGuestId);
  const isPaid = myParticipant?.paid ?? false;
  const amount = myShare?.total ?? 0;
  const hasHostUpi = !!room.hostUpiId;
  const upiUrl =
    hasHostUpi && amount > 0 ? buildPaymentUpiUrl(room, amount) : null;

  async function handleMarkPaid() {
    setError(null);
    setMarking(true);
    try {
      const updated = await markSelfPaid(room.code);
      onRoomUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setMarking(false);
    }
  }

  function handlePayWithUpi() {
    if (!upiUrl) return;
    if (isMobileDevice()) {
      window.location.href = upiUrl;
    } else {
      setShowQr(true);
    }
  }

  if (isHost) {
    const guests = room.participants.filter(
      (p) => p.guestId !== room.hostGuestId
    );
    if (guests.length === 0) return null;

    return (
      <div className="rounded-2xl border border-neutral-800 p-5 space-y-3">
        <h3 className="font-semibold text-sm text-neutral-200">Payment status</h3>
        {!hasHostUpi && (
          <p className="text-xs text-neutral-400">
            Add your UPI ID above so friends can pay you.
          </p>
        )}
        <ul className="space-y-2">
          {guests.map((p) => {
            const share = getParticipantShare(room, p.guestId);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm rounded-lg px-3 py-2"
              >
                <span>{p.name}</span>
                <div className="flex items-center gap-2">
                  {share && share.total > 0 && (
                    <span
                      className={`text-xs font-medium ${
                        p.paid ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      ₹{share.total.toFixed(2)}
                    </span>
                  )}
                  <span className={p.paid ? "badge-success" : "badge-pending"}>
                    {p.paid ? "Paid" : "Pending"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (!myShare || amount <= 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 p-5 text-center">
        <p className="text-sm text-neutral-400">
          Select what you had to see your share and pay.
        </p>
      </div>
    );
  }

  return (
    <div className="card-premium p-5 space-y-4">
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-100">
            You owe
          </p>
          <p className="text-3xl font-bold text-brand">
            ₹{amount.toFixed(2)}
          </p>
        </div>
        {isPaid && <span className="badge-success">Marked paid</span>}
      </div>

      {!hasHostUpi ? (
        <p className="relative text-sm text-neutral-400">
          Host hasn&apos;t added a UPI ID yet — ask them to add it in the room.
        </p>
      ) : isPaid ? (
        <div className="relative rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 text-center space-y-1">
          <p className="text-sm font-semibold text-amber-300">
            You&apos;re all set!
          </p>
          <p className="text-xs text-amber-200/80">Thanks for settling up</p>
        </div>
      ) : (
        <div className="relative flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handlePayWithUpi}
            disabled={!upiUrl}
            className="btn-primary-shimmer flex-1 py-2.5 text-sm"
          >
            Pay with UPI
          </button>
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={marking}
            className="btn-secondary flex-1 py-2.5 text-sm"
          >
            {marking ? "Saving..." : "I've paid"}
          </button>
        </div>
      )}

      {showQr && upiUrl && (
        <div className="relative flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-neutral-400">Scan with any UPI app</p>
          <QRDisplay url={upiUrl} size={160} />
          <button
            type="button"
            onClick={() => setShowQr(false)}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Close
          </button>
        </div>
      )}

      {error && <p className="relative text-sm text-red-300">{error}</p>}
    </div>
  );
}
