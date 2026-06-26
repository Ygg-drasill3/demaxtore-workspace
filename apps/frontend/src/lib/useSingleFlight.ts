import { useCallback, useRef, useState } from "react";

/**
 * Wraps an async action so that overlapping invocations are ignored while one is
 * already in flight. This prevents double-submit (rapid double-click) from firing
 * duplicate financial/state-changing requests (H11). The synchronous ref guard
 * blocks re-entry even before React re-renders with the disabled state.
 */
export function useSingleFlight<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<unknown>,
): { run: (...args: TArgs) => Promise<void>; busy: boolean } {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (...args: TArgs) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        await fn(...args);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [fn],
  );

  return { run, busy };
}
