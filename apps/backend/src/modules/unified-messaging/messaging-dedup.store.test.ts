import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessagingDedupStore, resetMessagingDedupStoreForTests } from "./messaging-dedup.store.js";

const redisSet = vi.fn().mockResolvedValue("OK");

vi.mock("../../lib/redis.js", () => ({
  getRedisClient: vi.fn().mockResolvedValue({
    set: (...args: unknown[]) => redisSet(...args),
    get: vi.fn().mockResolvedValue(null),
  }),
}));

describe("MessagingDedupStore", () => {
  const prisma = {
    messagingIdempotencyKey: {
      create: vi.fn().mockResolvedValue({ id: "1" }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMessagingDedupStoreForTests();
    redisSet.mockResolvedValue("OK");
  });

  it("claims key via Redis NX", async () => {
    const store = new MessagingDedupStore(prisma as never);
    const ok = await store.claim("notification", "test-key");
    expect(ok).toBe(true);
    expect(redisSet).toHaveBeenCalled();
  });

  it("rejects duplicate Redis key", async () => {
    redisSet.mockResolvedValueOnce(null);
    const store = new MessagingDedupStore(prisma as never);
    const ok = await store.claim("socket", "dup-key");
    expect(ok).toBe(false);
  });
});
