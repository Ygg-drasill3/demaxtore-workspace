import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnifiedMessagingService } from "./unified-messaging.service.js";
import { WhatsAppChannelAdapterStub } from "./unified-messaging.channel-adapter.js";

describe("UnifiedMessagingService", () => {
  const tx = {
    workspaceMessage: { create: vi.fn() },
    workspaceConversation: { update: vi.fn() },
  };

  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    workspaceConversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    workspaceConversationParticipant: {
      findFirst: vi.fn().mockResolvedValue({ id: "p1", userId: "admin-1" }),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    conversationContext: { create: vi.fn(), delete: vi.fn() },
    workspaceMessage: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  const admin = { id: "admin-1", email: "admin@demaxtore.local", role: "ADMIN" as const };
  const buyer = { id: "buyer-1", email: "buyer@acme.test", role: "BUYER" as const };
  const supplier = { id: "supplier-1", email: "supplier@test.com", role: "SUPPLIER" as const };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.workspaceConversationParticipant.findFirst.mockResolvedValue({ id: "p1", userId: "admin-1" });
    tx.workspaceMessage.create.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      authorUserId: "admin-1",
      messageType: "INTERNAL_NOTE",
      visibility: "ADMIN_ONLY",
      audienceScope: "INTERNAL",
      direction: "INTERNAL",
      channelSource: "WORKSPACE",
      body: "note",
      status: "ACTIVE",
      parentMessageId: null,
      externalMessageId: null,
      whatsappMessageId: null,
      createdAt: new Date(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
    });
  });

  it("creates internal note without whatsapp dispatch", async () => {
    const svc = new UnifiedMessagingService(prisma as never);
    const result = await svc.createInternalNote(admin, "conv-1", { body: "Ops note" });
    expect(result.audienceScope).toBe("INTERNAL");
    expect(tx.workspaceMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageType: "INTERNAL_NOTE",
          audienceScope: "INTERNAL",
          channelSource: "WORKSPACE",
        }),
      }),
    );
  });

  it("buyer cannot create internal note", async () => {
    const svc = new UnifiedMessagingService(prisma as never);
    await expect(svc.createInternalNote(buyer, "conv-1", { body: "nope" })).rejects.toThrow();
  });

  it("rejects whatsapp channel on external message in phase 2 stub", async () => {
    const svc = new UnifiedMessagingService(prisma as never);
    tx.workspaceMessage.create.mockResolvedValue({
      id: "msg-2",
      conversationId: "conv-1",
      authorUserId: admin.id,
      messageType: "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      audienceScope: "EXTERNAL",
      direction: "OUTBOUND",
      channelSource: "WHATSAPP",
      body: "hello",
      status: "ACTIVE",
      parentMessageId: null,
      externalMessageId: null,
      whatsappMessageId: null,
      createdAt: new Date(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
    });
    await expect(
      svc.createMessage(admin, "conv-1", { body: "hello", channel: "WHATSAPP" }),
    ).rejects.toThrow();
  });

  it("filters internal messages for buyer", async () => {
    prisma.workspaceMessage.findMany.mockResolvedValue([
      {
        id: "m1",
        conversationId: "conv-1",
        authorUserId: admin.id,
        messageType: "MESSAGE",
        visibility: "ALL_PARTICIPANTS",
        audienceScope: "EXTERNAL",
        direction: "OUTBOUND",
        channelSource: "WORKSPACE",
        body: "visible",
        status: "ACTIVE",
        parentMessageId: null,
        externalMessageId: null,
        whatsappMessageId: null,
        createdAt: new Date(),
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        failedAt: null,
      },
      {
        id: "m2",
        conversationId: "conv-1",
        authorUserId: admin.id,
        messageType: "INTERNAL_NOTE",
        visibility: "ADMIN_ONLY",
        audienceScope: "INTERNAL",
        direction: "INTERNAL",
        channelSource: "WORKSPACE",
        body: "hidden",
        status: "ACTIVE",
        parentMessageId: null,
        externalMessageId: null,
        whatsappMessageId: null,
        createdAt: new Date(),
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        failedAt: null,
      },
    ]);
    prisma.workspaceConversationParticipant.findFirst.mockResolvedValue({ id: "p2", userId: buyer.id });
    const svc = new UnifiedMessagingService(prisma as never);
    const page = await svc.listMessages(buyer, "conv-1");
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.body).toBe("visible");
  });

  it("supplier cannot see another supplier conversation", async () => {
    prisma.workspaceConversationParticipant.findFirst.mockResolvedValue(null);
    const svc = new UnifiedMessagingService(prisma as never);
    await expect(svc.listMessages(supplier, "conv-other")).rejects.toThrow();
  });
});

describe("WhatsAppChannelAdapterStub", () => {
  it("refuses send in phase 2", async () => {
    const adapter = new WhatsAppChannelAdapterStub();
    await expect(
      adapter.send({ conversationId: "c", messageId: "m", body: "x", phoneE164: "+905551234567" }),
    ).rejects.toThrow(/not enabled/);
  });
});
