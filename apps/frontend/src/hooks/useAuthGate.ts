import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/store/auth.store";
import { useAuthHydrated } from "@/hooks/useAuthHydrated";

/** Max time guards show a spinner before surfacing retry / sign-in (BUG-001, BUG-019). */
export const AUTH_GATE_TIMEOUT_MS = 12_000;

export function useAuthGate() {
  const rehydrated = useAuthHydrated();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const [timedOut, setTimedOut] = useState(false);

  const loading =
    !rehydrated || status === "idle" || status === "hydrating";

  const isAuthenticated = status === "authenticated" && !!user;

  useEffect(() => {
    if (!loading) setTimedOut(false);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setTimeout(() => setTimedOut(true), AUTH_GATE_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [loading, rehydrated, status]);

  const retry = useCallback(() => {
    setTimedOut(false);
    void hydrate();
  }, [hydrate]);

  return {
    rehydrated,
    status,
    user,
    loading,
    timedOut,
    retry,
    isAuthenticated,
  };
}
