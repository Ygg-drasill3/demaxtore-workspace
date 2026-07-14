import { Outlet } from "react-router-dom";
import { Shield } from "lucide-react";

/** Minimal chrome for passwordless conversation sessions — no sidebar or admin nav. */
export default function PasswordlessLayout() {
  return (
    <div data-testid="passwordless-layout" className="min-h-screen bg-paper-50 flex flex-col">
      <header className="border-b border-paper-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-ink-950 text-white grid place-items-center shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Secure access</p>
            <p className="text-sm font-medium text-ink-900 truncate">Passwordless Workspace Access</p>
          </div>
        </div>
        <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:inline">
          Communication only · No login required
        </span>
      </header>
      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
