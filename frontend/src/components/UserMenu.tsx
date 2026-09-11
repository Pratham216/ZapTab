import { useState, useRef, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import UserAvatar from "./UserAvatar";

export default function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isLoaded || !user) {
    return (
      <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 animate-pulse" />
    );
  }

  const displayName = user.fullName || user.firstName || "Host";
  const email = user.primaryEmailAddress?.emailAddress || "";

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile menu"
      >
        <UserAvatar
          name={displayName}
          size="sm"
          className="group-hover:border-amber-400 group-hover:shadow-[0_0_14px_rgba(245,158,11,0.35)] transition-all duration-200"
        />
      </button>

      {/* Custom Themed Dark & Gold Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-3 w-72 origin-top-right rounded-2xl border border-neutral-800/90 bg-neutral-950/95 p-2 shadow-2xl shadow-black/90 backdrop-blur-xl transition-all duration-200 z-50 animate-in fade-in zoom-in-95"
          role="menu"
        >
          {/* User Info Header */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/50 mb-1.5">
            <UserAvatar name={displayName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-100 truncate">
                {displayName}
              </p>
              {email && (
                <p className="text-xs text-neutral-400 truncate mt-0.5 font-mono">
                  {email}
                </p>
              )}
            </div>
          </div>

          <div className="my-1 border-t border-neutral-800/80" />

          {/* Manage Account Option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              openUserProfile?.();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-neutral-300 rounded-xl hover:bg-neutral-800/70 hover:text-amber-300 transition-colors duration-150 cursor-pointer text-left"
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-neutral-400 group-hover:text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Manage account</span>
          </button>

          {/* Sign Out Option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              signOut({ redirectUrl: "/" });
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-neutral-300 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors duration-150 cursor-pointer text-left"
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>

          <div className="mt-2 pt-2 border-t border-neutral-900 flex items-center justify-center">
            <span className="text-[10px] text-neutral-500 tracking-wider uppercase font-medium">
              ZapTab Account
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
