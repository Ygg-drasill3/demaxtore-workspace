import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { api, API_BASE, formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(`${API_BASE}/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
      });
      setResetToken(data.reset_token || null);
      setSubmitted(true);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!resetToken) return;
    await navigator.clipboard.writeText(resetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-md dmx-card p-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 mb-6"
        >
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>

        <div className="h-10 w-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center mb-4">
          <KeyRound className="h-4 w-4" />
        </div>

        <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-950">
          Reset your password
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500">
          Enter the email associated with your DeMaxtore account.
        </p>

        {!submitted ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="forgot-form">
            <div className="space-y-1.5">
              <label className="dmx-label">Email</label>
              <input
                data-testid="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full px-3.5 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:border-zinc-300"
              />
            </div>
            <button
              data-testid="forgot-submit"
              disabled={loading}
              type="submit"
              className="h-11 w-full rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? "Issuing token…" : "Send reset token"}
            </button>
          </form>
        ) : (
          <div data-testid="forgot-success" className="mt-6 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm px-3 py-2 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
              <span>
                If an account exists for that email, a reset token has been issued.
              </span>
            </div>
            {resetToken ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                <div className="dmx-label">Reset token (Sprint 1 only)</div>
                <div className="flex items-center gap-2">
                  <code
                    data-testid="forgot-token-value"
                    className="flex-1 text-[11px] font-mono text-zinc-700 break-all"
                  >
                    {resetToken}
                  </code>
                  <button
                    data-testid="forgot-token-copy"
                    onClick={copy}
                    className="shrink-0 h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs hover:bg-zinc-50 inline-flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <Link
                  data-testid="forgot-go-reset"
                  to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                  className="inline-flex items-center text-xs font-medium text-zinc-900 hover:underline"
                >
                  Use this token to reset →
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
