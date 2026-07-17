import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/redis.js", () => {
  const store = new Map<string, string>();
  return {
    getRedisClient: vi.fn().mockResolvedValue({
      set: vi.fn(async (key: string, _val: string, opts?: { NX?: boolean }) => {
        if (opts?.NX && store.has(key)) return null;
        store.set(key, "1");
        return "OK";
      }),
      get: vi.fn(async (key: string) => store.get(key) ?? null),
    }),
  };
});

import { getMessagingDedupStore, resetMessagingDedupStoreForTests } from "./messaging-dedup.store.js";
import { MessagingEventEmitter, resetMessagingEventDedupForTests } from "./messaging-write.bridge.js";

describe("Socket dedup multi-instance simulation", () => {
  const mockPrisma = {
    messagingIdempotencyKey: {
      create: vi.fn().mockResolvedValue({ id: "1" }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };

  beforeEach(() => {
    resetMessagingEventDedupForTests();
    resetMessagingDedupStoreForTests();
    vi.clearAllMocks();
  });

  it("two emitters with same idempotency key produce one DB claim", async () => {
    const dedup = getMessagingDedupStore(mockPrisma as never);
    const key = "messaging:message:new:conv1:msg1:v1";
    const a = await dedup.claim("socket", key);
    const b = await dedup.claim("socket", key);
    expect(a).toBe(true);
    expect(b).toBe(false);
  });

  it("MessagingEventEmitter dedups duplicate publish", async () => {
    const emitter = new MessagingEventEmitter(mockPrisma as never);
    const payload = {
      conversationId: "c1",
      messageId: "m1",
      idempotencyKey: "dedup-multi-1",
    };
    emitter.emit("messaging:message:new", payload);
    emitter.emit("messaging:message:new", payload);
    await new Promise((r) => setTimeout(r, 80));
    expect(mockPrisma.messagingIdempotencyKey.create).toHaveBeenCalled();
  });
});
