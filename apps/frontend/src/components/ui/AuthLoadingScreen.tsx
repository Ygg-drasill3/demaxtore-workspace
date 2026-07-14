import { Button } from "@/components/ui/Button";
import { loginPageUrl } from "@/lib/login-redirect";

type Props = {
  timedOut?: boolean;
  onRetry?: () => void;
};

/** Full-screen auth restore UI — never spins forever (BUG-001, BUG-019). */
export function AuthLoadingScreen({ timedOut = false, onRetry }: Props) {
  if (timedOut) {
    return (
      <div
        data-testid="auth-timeout"
        className="min-h-screen grid place-items-center bg-paper-50 px-6"
      >
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            Session could not be restored
          </h1>
          <p className="text-sm text-zinc-600">
            Authentication took too long or was interrupted. Retry or sign in again.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {onRetry && (
              <Button type="button" data-testid="auth-retry" onClick={onRetry}>
                Retry
              </Button>
            )}
            <a
              href={loginPageUrl()}
              data-testid="auth-sign-in-again"
              className="text-sm font-medium text-accent-900 hover:underline"
            >
              Sign in again
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="auth-loading" className="min-h-screen grid place-items-center bg-paper-50">
      <div className="h-8 w-8 rounded-full border-2 border-paper-200 border-t-accent-900 animate-spin" />
    </div>
  );
}
