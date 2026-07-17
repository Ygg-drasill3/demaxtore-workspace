import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessagingOutboxService } from "./messaging-outbox.service.js";

describe("MessagingOutboxService", () => {
  const prisma = {
    messagingOutboxEvent: {
      create: vi.fn().mockResolvedValue({ id: "o1" }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues with idempotency key", async () => {
    const svc = new MessagingOutboxService(prisma as never);
    await svc.enqueue({
      eventType: "LEGACY_MIRROR",
      aggregateType: "workspace_communication",
      aggregateId: "m1",
      idempotencyKey: "mirror:m1",
      payload: { surface: "test" },
    });
    expect(prisma.messagingOutboxEvent.create).toHaveBeenCalled();
  });

  it("ignores duplicate idempotency key", async () => {
    prisma.messagingOutboxEvent.create.mockRejectedValueOnce({ code: "P2002" });
    const svc = new MessagingOutboxService(prisma as never);
    const row = await svc.enqueue({
      eventType: "SOCKET_EMIT",
      aggregateType: "socket",
      aggregateId: "e1",
      idempotencyKey: "socket:e1",
      payload: {},
    });
    expect(row).toBeNull();
  });
});
