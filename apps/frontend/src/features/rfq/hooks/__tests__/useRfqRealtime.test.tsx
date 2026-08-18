// apps/frontend/src/features/rfq/hooks/__tests__/useRfqRealtime.test.tsx
//
// Asserts that socket events trigger the right TanStack Query invalidations.
//
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useRfqRealtime } from "../index";
import { getSocket } from "@/lib/socket";

vi.mock("@/store/auth.store", () => ({
  useAuth: Object.assign(
    () => ({ accessToken: "tok", status: "authenticated" }),
    {
      getState: () => ({ accessToken: "tok", status: "authenticated" }),
      subscribe: () => () => {},
    },
  ),
}));

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useRfqRealtime — socket → query cache invalidation", () => {
  it("invalidates ['rfq', id] when rfq.state.changed fires", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderHook(() => useRfqRealtime("rfq-1"), { wrapper: wrapper(client) });

    // The mocked socket exposes __emit() — see test/setup.ts
    const sock = getSocket() as unknown as { __emit: (e: string, p: unknown) => void };
    sock.__emit("rfq.state.changed", { workspaceId: "rfq-1", fromState: "RFQ_DRAFT", toState: "RFQ_SUBMITTED" });

    expect(spy).toHaveBeenCalledWith({ queryKey: ["rfq", "rfq-1"] });
  });

  it("invalidates timeline & clarifications for their respective events", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderHook(() => useRfqRealtime("rfq-2"), { wrapper: wrapper(client) });

    const sock = getSocket() as unknown as { __emit: (e: string, p: unknown) => void };
    sock.__emit("rfq.timeline.appended",    { workspaceId: "rfq-2" });
    sock.__emit("rfq.clarification.posted", { workspaceId: "rfq-2" });
    sock.__emit("rfq.participants.changed", { workspaceId: "rfq-2" });

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
    expect(keys).toContainEqual(["rfq", "rfq-2", "timeline"]);
    expect(keys).toContainEqual(["rfq", "rfq-2", "clarifications"]);
    expect(keys).toContainEqual(["rfq", "rfq-2"]);
  });
});
