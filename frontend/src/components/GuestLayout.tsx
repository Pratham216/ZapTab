import { Link } from "react-router-dom";
import ZapTabWordmark from "./ZapTabWordmark";

interface GuestLayoutProps {
  children: React.ReactNode;
}

export default function GuestLayout({ children }: GuestLayoutProps) {
  return (
    <div className="min-h-screen text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <img
              src="/zaptab-logo.png"
              alt="ZapTab Logo"
              className="h-9 w-9 object-contain"
            />
            <ZapTabWordmark size="lg" />
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
