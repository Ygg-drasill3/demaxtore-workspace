// apps/frontend/src/routes/guards/RequireAuth.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";
import { useAuthGate } from "@/hooks/useAuthGate";

/**
 * Gates a route tree behind a hydrated, authenticated session.
 * - Waits for zustand persist rehydration before judging auth state
 * - While validating, renders a neutral loading shell with timeout fallback
 * - On `unauthenticated`, redirects to /login with the original `from`
 */
export function RequireAuth() {
  const { loading, timedOut, retry, isAuthenticated, user } = useAuthGate();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen timedOut={timedOut} onRetry={retry} />;
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
