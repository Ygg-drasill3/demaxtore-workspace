// apps/frontend/src/routes/guards/RequireAuth.tsx
import { Outlet } from "react-router-dom";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";
import { RedirectToLogin } from "@/components/RedirectToLogin";
import { useAuthGate } from "@/hooks/useAuthGate";

/**
 * Gates a route tree behind a hydrated, authenticated session.
 * - Waits for zustand persist rehydration before judging auth state
 * - While validating, renders a neutral loading shell with timeout fallback
 * - On `unauthenticated`, redirects to /login (workspace SPA)
 */
export function RequireAuth() {
  const { loading, timedOut, retry, isAuthenticated, user } = useAuthGate();

  if (loading) {
    return <AuthLoadingScreen timedOut={timedOut} onRetry={retry} />;
  }
  if (!isAuthenticated || !user) {
    return <RedirectToLogin />;
  }
  return <Outlet />;
}
