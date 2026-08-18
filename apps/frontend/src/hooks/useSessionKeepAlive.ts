import { useEffect } from "react";
import { useAuth } from "@/store/auth.store";

/** Access tokens expire in ~15 min — refresh proactively while the tab is open. */
const REFRESH_INTERVAL_MS = 12 * 60 * 1000;

/**
 * Keeps cookie-based sessions alive during long workspace idle periods.
 * Refreshes on an interval and when the user returns to the tab.
 */
export function useSessionKeepAlive() {
  const status = useAuth((s) => s.status);
  const accessMode = useAuth((s) => s.accessMode);
  const refresh = useAuth((s) => s.refresh);

  useEffect(() => {
    if (status !== "authenticated" || accessMode === "passwordless") return;

    const tick = () => {
      void refresh().catch(() => {
        /* next API call will refresh or redirect to login */
      });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };

    const intervalId = window.setInterval(tick, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, accessMode, refresh]);
}
