import { describe, it, expect, vi } from "vitest";

vi.mock("../../config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env.js")>();
  return { ...actual, getUnifiedMessagingWriteMode: () => "unified_only" as const };
});

vi.mock("../../lib/redis.js", () => ({
  getRedisClient: vi.fn().mockResolvedValue({
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
  }),
}));

import { UnifiedMessagingWriteOrchestrator } from "./unified-messaging-write.orchestrator.js";
import { MessagingWriteBridge } from "./messaging-write.bridge.js";

function prismaStub() {
  const create = vi.fn().mockResolvedValue({ id: "m1" });
  const prisma = {
    workspaceMessage: { create, findFirst: vi.fn().mockResolvedValue(null) },
    workspaceConversation: { update: vi.fn().mockResolvedValue({}) },
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma, create };
}

describe("system event author", () => {
  const systemActor = { id: "system", email: "", role: "SYSTEM" } as never;

  it("persists a null author when the system event has no human actor", async () => {
    const { prisma, create } = prismaStub();
    const orchestrator = new UnifiedMessagingWriteOrchestrator(prisma as never);

    await orchestrator.createSystemMessage(systemActor, {
      conversationId: "11111111-1111-1111-1111-111111111111",
      authorUserId: null,
      body: "order moved to PRODUCTION",
      systemEventKey: "order.state_changed",
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.authorUserId).toBeNull();
  });

  it("never writes a non-uuid sentinel into author_user_id", async () => {
    const { prisma, create } = prismaStub();
    const orchestrator = new UnifiedMessagingWriteOrchestrator(prisma as never);

    await orchestrator.createSystemMessage(systemActor, {
      conversationId: "11111111-1111-1111-1111-111111111111",
      authorUserId: null,
      body: "customs cleared",
    });

    const written = create.mock.calls[0][0].data.authorUserId;
    expect(written).not.toBe("system");
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(written === null || uuid.test(written)).toBe(true);
  });

  it("keeps a real actor as the author", async () => {
    const { prisma, create } = prismaStub();
    const orchestrator = new UnifiedMessagingWriteOrchestrator(prisma as never);
    const userId = "22222222-2222-2222-2222-222222222222";

    await orchestrator.createSystemMessage({ id: userId, email: "a@b.c", role: "ADMIN" } as never, {
      conversationId: "11111111-1111-1111-1111-111111111111",
      authorUserId: userId,
      body: "admin forced clearance",
    });

    expect(create.mock.calls[0][0].data.authorUserId).toBe(userId);
  });
});

describe("system event bridge", () => {
  function bridgePrisma() {
    return {
      workspaceConversation: {
        findUnique: vi.fn().mockResolvedValue({ id: "c1" }),
        update: vi.fn().mockResolvedValue({}),
      },
      workspaceParticipant: { findMany: vi.fn().mockResolvedValue([]) },
      workspaceConversationParticipant: { upsert: vi.fn().mockResolvedValue({}) },
      conversationContext: { findFirst: vi.fn().mockResolvedValue({ id: "ctx1" }) },
      workspace: { findUnique: vi.fn().mockResolvedValue(null) },
      messagingIdempotencyKey: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "1" }),
      },
    };
  }

  it("mirrors an actorless system event with a null author, not the sentinel id", async () => {
    const spy = vi
      .spyOn(UnifiedMessagingWriteOrchestrator.prototype, "createSystemMessage")
      .mockResolvedValue(null as never);
    const bridge = new MessagingWriteBridge(bridgePrisma() as never);

    await bridge.onSystemMessage({
      workspaceType: "ORDER",
      workspaceId: "33333333-3333-3333-3333-333333333333",
      auditWorkspaceId: "33333333-3333-3333-3333-333333333333",
      messageId: "44444444-4444-4444-4444-444444444444",
      body: "shipment departed",
      systemEventKey: "shipment.departed",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1].authorUserId).toBeNull();
    spy.mockRestore();
  });
});
