// apps/frontend/src/layouts/AuthLayout.tsx
import { Link, Outlet } from "react-router-dom";
import { LANDING_COPY } from "@/content/launch-copy";
import { BrandLogo } from "@/layouts/components/BrandLogo";

/**
 * Auth-shell. Used for /login, /forgot-password, /reset-password.
 * Split-screen — branded panel on the left, form on the right.
 */
export default function AuthLayout() {
  return (
    <div data-testid="auth-layout" className="min-h-screen grid lg:grid-cols-2 bg-paper-50">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 bg-ink-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 70%, white 1px, transparent 1px)",
                      backgroundSize: "32px 32px, 48px 48px" }} />
        <div className="relative z-10">
          <Link to="/welcome" className="inline-block hover:opacity-90 transition-opacity">
            <BrandLogo className="h-12 max-w-[220px]" />
          </Link>
        </div>
        <div className="relative z-10 max-w-md space-y-6">
          <div>
            <div className="dmx-eyebrow text-zinc-400">{LANDING_COPY.eyebrow}</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-3 leading-tight">
              {LANDING_COPY.headline}
            </h1>
            <p className="text-sm text-zinc-300 mt-4 leading-relaxed">
              {LANDING_COPY.subhead}
            </p>
          </div>
          <ul className="space-y-3 text-sm text-zinc-400">
            {LANDING_COPY.pillars.map((p) => (
              <li key={p.title}>
                <span className="text-zinc-200 font-medium">{p.title}</span>
                <span className="text-zinc-500"> — {p.body}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-xs text-zinc-500">
          © {new Date().getFullYear()} DeMaxtore · <Link to="/welcome" className="hover:text-zinc-300 underline-offset-2 hover:underline">Product overview</Link>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
