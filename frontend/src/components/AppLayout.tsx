import { Link } from "react-router-dom";
import UserMenu from "./UserMenu";
import ZapTabWordmark from "./ZapTabWordmark";

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
              src="/zaptab-logo.png"
              alt="ZapTab Logo"
              className="h-9 w-9 object-contain"
            />
            <div>
              <ZapTabWordmark as="h1" size="lg" />
              <p className="text-xs leading-relaxed text-neutral-100">
                Scan the bill. Tap what you ate. Pay your share.
              </p>
            </div>
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
