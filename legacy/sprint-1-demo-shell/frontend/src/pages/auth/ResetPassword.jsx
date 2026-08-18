import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, API_BASE, formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post(`${API_BASE}/auth/reset-password`, {
        token,
        new_password: password,
      });
      toast.success("Password updated. Please sign in.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-md dmx-card p-8">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-950">
          Set a new password
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500">Paste the token issued to you and choose a new password.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="reset-form">
          <div className="space-y-1.5">
            <label className="dmx-label">Reset token</label>
            <input
              data-testid="reset-token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="h-11 w-full px-3.5 rounded-lg border border-zinc-200 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
            />
          </div>
          <div className="space-y-1.5">
            <label className="dmx-label">New password</label>
            <input
              data-testid="reset-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full px-3.5 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
            />
          </div>
          <div className="space-y-1.5">
            <label className="dmx-label">Confirm password</label>
            <input
              data-testid="reset-confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 w-full px-3.5 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
            />
          </div>

          {error ? (
            <div data-testid="reset-error" className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          ) : null}

          <button
            data-testid="reset-submit"
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
