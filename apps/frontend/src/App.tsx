// apps/frontend/src/App.tsx
import { useEffect } from "react";
import { AppRoutes } from "./routes";
import { useAuth } from "./store/auth.store";
import { useAuthHydrated } from "./hooks/useAuthHydrated";
import { GlobalAlertBridge } from "./features/exception-hub/components/GlobalAlertBridge";

/**
 * Top-level shell. Waits for persist rehydration before validating the session
 * so RequireAuth never redirects to /login with a valid session in sessionStorage.
 */
export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  const rehydrated = useAuthHydrated();

  useEffect(() => {
    if (rehydrated) hydrate();
  }, [rehydrated, hydrate]);

  return (
    <>
      <GlobalAlertBridge />
      <AppRoutes />
    </>
  );
}
