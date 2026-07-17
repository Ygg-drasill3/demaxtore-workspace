import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env.js")>();
  return {
    ...actual,
    getUnifiedMessagingWriteMode: vi.fn(() => "unified_primary_legacy_mirror"),
  };
});

import { getUnifiedMessagingWriteMode } from "../../config/env.js";
import { MessagingWriteDispatcher } from "./messaging-write.dispatcher.js";

describe("MessagingWriteDispatcher", () => {
  const mockTx = {
    workspaceConversation: { update: vi.fn().mockResolvedValue({}) },
    messagingOutboxEvent: { create: vi.fn().mockResolvedValue({ id: "o1" }) },
  };

  const mockPrisma = {
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatchUnifiedFirst enqueues outbox in same transaction", async () => {
    const dispatcher = new MessagingWriteDispatcher(mockPrisma as never);
    await dispatcher.dispatchUnifiedFirst({
      surface: "unified_api",
      actor: { id: "u1", email: "", role: "ADMIN" },
      idempotencyKey: "test:1",
      unified: async (tx) => {
        await tx.workspaceConversation.update({
          where: { id: "c1" },
          data: { assignedUserId: "u2" },
        });
        return { ok: true };
      },
      outbox: () => [
        {
          eventType: "SOCKET_EMIT",
          aggregateType: "unified_api",
          aggregateId: "c1",
          conversationId: "c1",
          idempotencyKey: "socket:test:1",
          payload: { event: "messaging:conversation:assigned", eventPayload: {} },
        },
      ],
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTx.messagingOutboxEvent.create).toHaveBeenCalled();
  });

  it("dispatchLegacyFirst runs legacy in mirror modes", async () => {
    vi.mocked(getUnifiedMessagingWriteMode).mockReturnValue("unified_primary_legacy_mirror");
    const dispatcher = new MessagingWriteDispatcher(mockPrisma as never);
    const legacy = vi.fn().mockResolvedValue({ id: "m1" });
    const result = await dispatcher.dispatchLegacyFirst({
      surface: "workspace_communication",
      actor: { id: "u1", email: "", role: "ADMIN" },
      idempotencyKey: "legacy:1",
      legacy,
    });
    expect(legacy).toHaveBeenCalled();
    expect(result).toEqual({ id: "m1" });
  });

  it("rejects unified write in legacy_only mode", async () => {
    vi.mocked(getUnifiedMessagingWriteMode).mockReturnValue("legacy_only");
    const dispatcher = new MessagingWriteDispatcher(mockPrisma as never);
    await expect(
      dispatcher.dispatchUnifiedFirst({
        surface: "unified_api",
        actor: { id: "u1", email: "", role: "ADMIN" },
        idempotencyKey: "x",
        unified: async () => ({}),
      }),
    ).rejects.toThrow("UNIFIED_WRITE_BLOCKED_IN_LEGACY_ONLY");
  });
});
