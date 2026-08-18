import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { dashboardPathFor } from "@/lib/nav";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { role: "Buyer", email: "buyer@demaxtore.com", password: "Buyer@123" },
  { role: "Supplier", email: "supplier@demaxtore.com", password: "Supplier@123" },
  { role: "Admin", email: "admin@demaxtore.com", password: "Admin@123" },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    const to = location.state?.from?.pathname || dashboardPathFor(user.role);
    return <Navigate to={to} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Login failed");
      return;
    }
    toast.success(`Welcome back, ${result.user.name}`);
    navigate(dashboardPathFor(result.user.role), { replace: true });
  };

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] grid grid-cols-1 lg:grid-cols-5">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:col-span-2 relative bg-zinc-950 text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 dmx-grid-bg opacity-20" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-display font-bold">
            dM
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            DeMaxtore
          </span>
        </div>

        <div className="relative z-10 space-y-6 max-w-sm">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] uppercase tracking-[0.18em]">
            <ShieldCheck className="h-3 w-3" /> Sprint 1 · Foundation
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05]">
            The operating system for B2B sourcing & import.
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            One Workspace. One Timeline. One State Machine. One Next-Action Engine — designed for buyers, suppliers, and operators working a single trade together.
          </p>
        </div>

        <div className="relative z-10 text-xs text-zinc-400 max-w-sm">
          © {new Date().getFullYear()} DeMaxtore — Workspace-Centric Sourcing OS
        </div>
      </div>

      {/* Right form panel */}
      <div className="lg:col-span-3 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-display font-bold">
              dM
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              DeMaxtore
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-950">
              Sign in to your workspace
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Use your DeMaxtore credentials. New users are seeded for demonstration.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
            <div className="space-y-1.5">
              <label className="dmx-label">Email</label>
              <input
                data-testid="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 w-full px-3.5 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:border-zinc-300 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="dmx-label">Password</label>
                <Link
                  data-testid="login-forgot-link"
                  to="/forgot-password"
                  className="text-xs text-zinc-500 hover:text-zinc-900"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full px-3.5 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:border-zinc-300 transition-all"
              />
            </div>

            {error ? (
              <div
                data-testid="login-error"
                className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2"
              >
                {error}
              </div>
            ) : null}

            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 dmx-card p-4">
            <div className="dmx-label mb-2">Demo accounts</div>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  data-testid={`demo-account-${a.role.toLowerCase()}`}
                  type="button"
                  onClick={() => fillDemo(a)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-zinc-50 text-left transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-900">{a.role}</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{a.email}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                    Use
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
