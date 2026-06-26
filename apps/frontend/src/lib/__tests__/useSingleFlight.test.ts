import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSingleFlight } from "../useSingleFlight";

// H11 regression: a single-flight action must ignore overlapping invocations
// (rapid double-click) so duplicate state-changing requests are never sent.
describe("useSingleFlight (H11 double-submit guard)", () => {
  it("ignores a second invocation while the first is still in flight", async () => {
    let resolveFirst!: () => void;
    const fn = vi.fn(() => new Promise<void>((resolve) => { resolveFirst = resolve; }));

    const { result } = renderHook(() => useSingleFlight(fn));

    // Two near-simultaneous clicks.
    await act(async () => {
      void result.current.run();
      void result.current.run();
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(true);

    // Complete the in-flight call.
    await act(async () => {
      resolveFirst();
    });
    await waitFor(() => expect(result.current.busy).toBe(false));
  });

  it("allows a new invocation after the previous one settles", async () => {
    const fn = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useSingleFlight(fn));

    await act(async () => { await result.current.run(); });
    await act(async () => { await result.current.run(); });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.current.busy).toBe(false);
  });

  it("resets the guard even if the action rejects", async () => {
    const fn = vi.fn(() => Promise.reject(new Error("boom")));
    const { result } = renderHook(() => useSingleFlight(fn));

    await act(async () => {
      await result.current.run().catch(() => {});
    });

    expect(result.current.busy).toBe(false);
    await act(async () => { await result.current.run().catch(() => {}); });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
