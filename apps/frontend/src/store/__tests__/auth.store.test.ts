import { describe, it, expect, beforeEach, vi } from "vitest";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ post: postMock })),
  },
}));

import { resetAuthHydrateFlight, useAuth } from "../auth.store";

describe("useAuth.hydrate", () => {
  beforeEach(() => {
    postMock.mockReset();
    resetAuthHydrateFlight();
    localStorage.clear();
    sessionStorage.clear();
    useAuth.setState({ user: null, accessToken: null, status: "idle" });
  });

  it("completes refresh even when status is already hydrating (BUG-001)", async () => {
    const user = {
      id: "u1",
      email: "a@b.com",
      displayName: "A",
      role: "BUYER" as const,
      organisation: null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    useAuth.setState({ user, accessToken: "old", status: "hydrating" });

    postMock.mockResolvedValueOnce({
      data: { user, accessToken: "fresh" },
    });

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("authenticated");
    expect(useAuth.getState().accessToken).toBe("fresh");
    expect(postMock).toHaveBeenCalledWith("/auth/refresh");
  });

  it("deduplicates concurrent hydrate calls", async () => {
    postMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { accessToken: "t", user: null } }), 20);
        }),
    );

    const p1 = useAuth.getState().hydrate();
    const p2 = useAuth.getState().hydrate();
    await Promise.all([p1, p2]);

    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it("sets unauthenticated when refresh fails", async () => {
    postMock.mockRejectedValueOnce(new Error("401"));

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("unauthenticated");
    expect(useAuth.getState().user).toBeNull();
  });
});
