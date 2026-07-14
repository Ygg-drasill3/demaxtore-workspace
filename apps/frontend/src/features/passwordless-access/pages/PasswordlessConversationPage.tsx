import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ConversationHubPanel from "@/features/conversation-hub/components/ConversationHubPanel";
import { passwordlessAccessApi } from "@/features/passwordless-access/lib/passwordless-access.api";
import { useAuth } from "@/store/auth.store";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import { AlertTriangle, Loader2, MessageSquare } from "lucide-react";

/**
 * Scanner-safe passwordless entry: GET / interstitial render never consumes the token.
 * Token consumption occurs only after explicit user action (POST consume).
 */
export default function PasswordlessConversationPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const setPasswordlessSession = useAuth((s) => s.setPasswordlessSession);
  const scope = useAuth((s) => s.passwordlessScope);
  const accessMode = useAuth((s) => s.accessMode);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(() => {
    const existing = useAuth.getState();
    return existing.accessMode === "passwordless"
      && Boolean(existing.passwordlessScope)
      && Boolean(existing.accessToken);
  });

  const handleContinue = () => {
    if (!token) {
      setError("This access link is missing a token.");
      return;
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const result = await passwordlessAccessApi.consume({ token });
        setPasswordlessSession(result.user, result.accessToken, result.scope);
        setConfirmed(true);
      } catch {
        setError("This access link is invalid, expired, or has already been used.");
      } finally {
        setLoading(false);
      }
    })();
  };

  if (confirmed && accessMode === "passwordless" && scope) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-10 space-y-4" data-testid="passwordless-conversation-page">
        <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
          You are viewing this workspace via a secure, time-limited link. You can read and reply in the conversation.
          Workspace approvals and settings require a full sign-in.
        </div>
        <ConversationHubPanel
          workspaceType={scope.workspaceType as CommWorkspaceType}
          workspaceId={scope.workspaceId}
          communicationOnly
          testId="passwordless-conversation-hub"
        />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-lg mx-auto p-10 text-center space-y-4" data-testid="passwordless-error">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 text-red-600 grid place-items-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-semibold text-ink-900">Access link unavailable</h1>
        <p className="text-sm text-zinc-500">This access link is missing a token.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 sm:p-10 space-y-6" data-testid="passwordless-interstitial">
      <div className="text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-full bg-sky-50 text-sky-700 grid place-items-center">
          <MessageSquare className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Open Workspace Conversation</h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          You received a secure DeMaxtore notification. Continue only if you expected this message.
          Replies happen inside Workspace — do not reply by email.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" data-testid="passwordless-error">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-3 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
        data-testid="passwordless-continue"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continue to Conversation
      </button>

      <p className="text-xs text-center text-zinc-400">
        This link is single-use and time-limited. Email scanners cannot open the conversation without your action.
      </p>
    </div>
  );
}
