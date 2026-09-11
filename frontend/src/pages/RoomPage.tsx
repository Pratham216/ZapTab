import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRoom, leaveRoom, setItemSelection } from "../api/rooms";
import { getGuestId, isUserSession } from "../lib/auth";
import { useSocket } from "../hooks/useSocket";
import QRDisplay from "../components/QRDisplay";
import HostUpiCard from "../components/HostUpiCard";
import PaymentPanel from "../components/PaymentPanel";
import UserAvatar from "../components/UserAvatar";
import ItemSelectionList, {
  applySelectionChange,
} from "../components/ItemSelectionList";
import { getParticipantShare } from "../lib/payments";
import { copyToClipboard } from "../lib/clipboard";
import type { Participant, Room } from "../api/rooms";

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const roomCode = code?.toUpperCase() ?? "";
  const myGuestId = getGuestId();

  const { data: room, isLoading, error } = useQuery({
    queryKey: ["room", roomCode],
    queryFn: () => getRoom(roomCode),
    enabled: !!roomCode,
    refetchInterval: 30000,
  });

  useSocket(roomCode, {
    onParticipantJoined: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    },
    onParticipantLeft: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    },
    onItemSelectionChanged: (data) => {
      if (data.guestId === myGuestId) return;

      queryClient.setQueryData<Room>(["room", roomCode], (old) => {
        if (!old) return old;
        return applySelectionChange(
          old,
          data.itemId,
          data.guestId,
          data.quantity
        );
      });
    },
    onPaymentMarked: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    },
    onUpiUpdated: (data) => {
      queryClient.setQueryData<Room>(["room", roomCode], (old) =>
        old ? { ...old, hostUpiId: data.hostUpiId } : old
      );
    },
  });

  async function handleShare() {
    if (!room?.joinUrl) return;
    setCopyError(null);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Join ZapTab bill at ${room.bill?.restaurantName || 'Restaurant'}`,
          text: `Join our ZapTab bill room using code ${room.code}!`,
          url: room.joinUrl,
        });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }

    const ok = await copyToClipboard(room.joinUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setCopyError("Couldn't copy automatically — tap the link above to select it");
  }

  async function copyLink() {
    if (!room?.joinUrl) return;
    setCopyError(null);

    const ok = await copyToClipboard(room.joinUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setCopyError("Couldn't copy automatically — tap the link above to select it");
  }

  async function handleLeave() {
    if (!roomCode) return;
    await leaveRoom(roomCode);
    queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    navigate(isUserSession() ? "/app" : "/", { replace: true });
  }

  async function handleSetQuantity(itemId: string, quantity: number) {
    if (!roomCode || !myGuestId) return;

    setSelectionError(null);

    const previous = queryClient.getQueryData<Room>(["room", roomCode]);
    queryClient.setQueryData<Room>(["room", roomCode], (old) => {
      if (!old) return old;
      return applySelectionChange(old, itemId, myGuestId, quantity);
    });
    setUpdatingItemId(itemId);

    try {
      const updated = await setItemSelection(roomCode, itemId, quantity);
      queryClient.setQueryData(["room", roomCode], updated);
    } catch (err) {
      if (previous) {
        queryClient.setQueryData(["room", roomCode], previous);
      }
      setSelectionError(
        err instanceof Error ? err.message : "Failed to update selection"
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-red-300">Room not found or expired.</p>
        <Link to="/" className="text-amber-400 hover:text-amber-300 transition-colors">
          Scan a new bill
        </Link>
      </div>
    );
  }

  const bill = room.bill;
  const isHost = myGuestId === room.hostGuestId;

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {bill?.restaurantName || "Split room"}
        </h2>
        <p className="text-neutral-400 text-sm mt-2">
          Code: <span className="font-mono text-amber-400 font-medium">{room.code}</span>
          {isHost && (
            <span className="ml-2 badge-gold">Host</span>
          )}
        </p>
      </div>

      {isHost && (
        <HostUpiCard
          roomCode={roomCode}
          hostUpiId={room.hostUpiId ?? ""}
          variant={room.hostUpiId ? "inline" : "banner"}
          onUpdated={(hostUpiId) => {
            queryClient.setQueryData<Room>(["room", roomCode], (old) =>
              old ? { ...old, hostUpiId } : old
            );
          }}
        />
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 p-5 space-y-3">
          <h3 className="font-semibold text-sm text-neutral-200">Invite friends</h3>
          <div className="flex justify-center">
            <QRDisplay url={room.joinUrl} />
          </div>
          <p className="text-xs text-neutral-500 text-center break-all font-mono select-all">
            {room.joinUrl}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleShare}
              className="btn-primary py-2 text-xs flex items-center justify-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Share link
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="btn-secondary py-2 text-xs"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          {copyError ? (
            <p className="text-xs text-amber-300/90 text-center">{copyError}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-neutral-800 p-5">
          <h3 className="font-semibold text-sm text-neutral-200 mb-3">
            Participants ({room.participants.length})
          </h3>
          <ul className="space-y-2">
            {room.participants.map((p: Participant) => {
              const isRoomHost = p.guestId === room.hostGuestId;
              const share = getParticipantShare(room, p.guestId);
              return (
              <li
                key={p.id}
                className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 bg-neutral-900/50"
              >
                <UserAvatar name={p.name} size="xs" />
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {!isRoomHost && share && share.total > 0 && (
                    <span
                      className={`text-xs font-medium ${
                        p.paid ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      ₹{share.total.toFixed(0)}
                    </span>
                  )}
                  {!isRoomHost && p.paid && (
                    <span className="badge-success px-1.5 py-0.5">
                      Paid
                    </span>
                  )}
                  {isRoomHost && (
                    <span className="badge-gold">host</span>
                  )}
                </div>
              </li>
            );
            })}
          </ul>
        </div>
      </div>

      {bill && (
        <ItemSelectionList
          bill={bill}
          selections={room.selections ?? {}}
          participants={room.participants}
          myGuestId={myGuestId}
          onSetQuantity={handleSetQuantity}
          updatingItemId={updatingItemId}
        />
      )}

      {selectionError && (
        <p className="text-sm text-red-300 text-center">{selectionError}</p>
      )}

      <PaymentPanel
        room={room}
        myGuestId={myGuestId}
        isHost={isHost}
        onRoomUpdated={(updated) =>
          queryClient.setQueryData(["room", roomCode], updated)
        }
      />

      <div className="flex gap-3">
        <button onClick={handleLeave} className="btn-danger-outline">
          Leave room
        </button>
        {bill && (
          <Link to={`/bill/${bill.id}`} className="btn-gold-outline">
            Edit bill
          </Link>
        )}
      </div>
    </div>
  );
}
