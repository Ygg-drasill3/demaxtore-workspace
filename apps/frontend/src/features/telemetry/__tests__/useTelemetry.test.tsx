// apps/frontend/src/features/telemetry/__tests__/useTelemetry.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  api: { defaults: { baseURL: "http://test.local/api" }, post: postMock },
}));

vi.mock("@/store/auth.store", () => ({
  useAuth: { getState: () => ({ accessToken: "test-token" }) },
}));

import { useTelemetry } from "../useTelemetry";

beforeEach(() => {
  postMock.mockReset();
  postMock.mockResolvedValue({});
  global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
});

describe("useTelemetry", () => {
  it("fires `workspace.viewed` with workspaceId via fetch+auth", () => {
    const { result } = renderHook(() => useTelemetry());
    act(() => result.current.track("workspace.viewed", { workspaceId: "w1" }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://test.local/api/telemetry");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.event).toBe("workspace.viewed");
    expect(body.workspaceId).toBe("w1");
    expect(postMock).not.toHaveBeenCalled();
  });

  it("fires `next_action.clicked` with targetId", () => {
    const { result } = renderHook(() => useTelemetry());
    act(() => result.current.track("next_action.clicked", { workspaceId: "w1", targetId: "submit_rfq" }));
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      event: "next_action.clicked",
      targetId: "submit_rfq",
    });
  });

  it("falls back to axios when fetch is unavailable", () => {
    const prevFetch = global.fetch;
    // @ts-expect-error simulate old runtime
    global.fetch = undefined;

    const { result } = renderHook(() => useTelemetry());
    act(() => result.current.track("document.downloaded", { workspaceId: "w1", targetId: "doc-1" }));

    expect(postMock).toHaveBeenCalledWith("/telemetry", expect.objectContaining({
      event: "document.downloaded",
      targetId: "doc-1",
    }));

    global.fetch = prevFetch;
  });
});
