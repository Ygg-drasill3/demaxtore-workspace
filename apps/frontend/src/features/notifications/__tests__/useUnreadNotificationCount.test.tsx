// apps/frontend/src/features/notifications/__tests__/useUnreadNotificationCount.test.tsx
//
// Verifies the notification-bell counter reacts live to socket events.
//
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useUnreadNotificationCount } from "../hooks";
import { useAuth } from "@/store/auth.store";
import { getSocket } from "@/lib/socket";

vi.mock("../lib/notifications.api", () => ({
  notificationsApi: {
    unreadCount: vi.fn().mockResolvedValue({ count: 2 }),
  },
}));

function wrap(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAuth.setState({
    user: {
      id: "u", email: "a@b.io", displayName: "A", role: "BUYER",
      organisation: null, avatarUrl: null, createdAt: new Date().toISOString(),
    },
    accessToken: "t", status: "authenticated",
  });
});

describe("useUnreadNotificationCount", () => {
  it("increments cache on notification:new socket event", async () => {
    const client = new QueryClient();
    // Seed BEFORE renderHook so the initial render reads the cached value.
    client.setQueryData(["notifications", "unread-count"], { count: 2 });

    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current).toBe(2));

    const sock = getSocket() as unknown as { __emit: (e: string, p: unknown) => void };
    act(() => {
      sock.__emit("notification:new", {
        notification: {
          id: "n1", type: "INFO", titleKey: "x", title: "RFQ assigned", body: null,
          link: null, workspaceId: null, workspaceType: null, read: false, readAt: null,
          createdAt: new Date().toISOString(),
        },
      });
    });

    expect(client.getQueryData(["notifications", "unread-count"])).toEqual({ count: 3 });
  });
});
