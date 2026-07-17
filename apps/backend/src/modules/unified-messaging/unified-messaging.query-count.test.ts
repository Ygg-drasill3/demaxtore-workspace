import { describe, it, expect, vi } from "vitest";
import { UnifiedMessagingRepository } from "./unified-messaging.repository.js";

describe("UnifiedMessagingRepository query count", () => {
  it("listConversations uses batch unread query not per-conversation", async () => {
    let queryRawCalls = 0;
    let findManyCalls = 0;

    const conversations = Array.from({ length: 10 }, (_, i) => ({
      id: `conv-${i}`,
      workspaceType: "RFQ",
      workspaceId: `ws-${i}`,
      status: "ACTIVE",
      subject: null,
      priority: "NORMAL",
      primaryChannel: "WORKSPACE",
      assignedUserId: null,
      isArchived: false,
      lastMessageAt: new Date(),
      metadata: {},
      createdAt: new Date(),
      participants: [],
      contexts: [],
      messages: [],
    }));

    const prisma = {
      workspaceConversation: {
        findMany: vi.fn().mockImplementation(async () => {
          findManyCalls += 1;
          return conversations;
        }),
      },
      $queryRaw: vi.fn().mockImplementation(async () => {
        queryRawCalls += 1;
        return conversations.map((c) => ({ conversation_id: c.id, cnt: BigInt(0) }));
      }),
    };

    const repo = new UnifiedMessagingRepository(prisma as never);
    await repo.listConversations(
      { id: "admin", email: "a@test.com", role: "ADMIN" },
      { limit: 10 },
    );

    expect(findManyCalls).toBe(1);
    expect(queryRawCalls).toBe(1);
  });

  for (const count of [1, 10, 100, 500]) {
    it(`listConversations at ${count} items uses O(1) batch unread queries`, async () => {
      let queryRawCalls = 0;
      const conversations = Array.from({ length: count }, (_, i) => ({
        id: `conv-${i}`,
        workspaceType: "RFQ",
        workspaceId: `ws-${i}`,
        status: "ACTIVE",
        subject: null,
        priority: "NORMAL",
        primaryChannel: "WORKSPACE",
        assignedUserId: null,
        isArchived: false,
        lastMessageAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        participants: [],
        contexts: [],
        messages: [],
      }));

      const prisma = {
        workspaceConversation: {
          findMany: vi.fn().mockResolvedValue(conversations.slice(0, Math.min(count, 31))),
        },
        $queryRaw: vi.fn().mockImplementation(async () => {
          queryRawCalls += 1;
          return [];
        }),
      };

      const repo = new UnifiedMessagingRepository(prisma as never);
      await repo.listConversations(
        { id: "admin", email: "a@test.com", role: "ADMIN" },
        { limit: Math.min(count, 30) },
      );
      expect(queryRawCalls).toBeLessThanOrEqual(2);
    });
  }
});
