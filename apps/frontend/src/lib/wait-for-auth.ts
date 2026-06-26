// apps/frontend/src/lib/wait-for-auth.ts
import { useAuth } from "@/store/auth.store";
import { AUTH_GATE_TIMEOUT_MS } from "@/hooks/useAuthGate";

const POLL_MS = 25;

/** Blocks API calls until session hydration / refresh has finished. */
export async function waitForAuthReady(): Promise<void> {
  const deadline = Date.now() + AUTH_GATE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { status } = useAuth.getState();
    if (status === "authenticated" || status === "unauthenticated") return;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  // Avoid indefinite axios queue deadlocks when guards are still loading (BUG-018).
  const { status } = useAuth.getState();
  if (status === "idle" || status === "hydrating") {
    void useAuth.getState().hydrate();
  }
}

export function isAuthReady(): boolean {
  const { status } = useAuth.getState();
  return status === "authenticated" || status === "unauthenticated";
}
