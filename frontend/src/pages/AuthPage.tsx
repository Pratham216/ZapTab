import { Link, useSearchParams } from "react-router-dom";
import ZapTabWordmark from "../components/ZapTabWordmark";
import AuthForm from "../components/AuthForm";

export default function AuthPage() {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "sign-up" ? "sign_up" : "sign_in";

  return (
    <div className="min-h-screen text-neutral-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex justify-center">
            <ZapTabWordmark size="xl" />
          </Link>
          <div className="space-y-1.5">
            <h1 className="auth-welcome-shimmer">Welcome to ZapTab</h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Sign in to scan bills, split with friends, and get paid over UPI.
            </p>
          </div>
        </div>

        <AuthForm initialMode={initialMode} />

        <p className="text-center text-xs text-neutral-600">
          <Link to="/" className="hover:text-neutral-400 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
