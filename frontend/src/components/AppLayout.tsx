import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import SplitSnapWordmark from "./SplitSnapWordmark";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-3">
            <img
              src="/splitsnap-logo.png"
              alt="SplitSnap Logo"
              className="h-9 w-9 object-contain"
            />
            <div>
              <SplitSnapWordmark as="h1" size="lg" />
              <p className="text-xs leading-relaxed text-neutral-100">
                Scan the bill. Tap what you ate. Pay your share.
              </p>
            </div>
          </Link>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
              },
            }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
