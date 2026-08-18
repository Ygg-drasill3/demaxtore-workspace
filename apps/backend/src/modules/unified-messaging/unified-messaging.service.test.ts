import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnifiedMessagingService } from "./unified-messaging.service.js";
import { WhatsAppChannelAdapterStub } from "./unified-messaging.channel-adapter.js";

vi.mock("../chat/whatsapp.service.js", () => ({
  isWhatsAppConfigured: vi.fn().mockReturnValue(true),
  normalizePhone: (p: string | null | undefined) => (p ? p.replace(/\D/g, "") || null : null),
}));

vi.mock("../../lib/secret-crypto.js", () => ({
  decryptSecret: vi.fn().mockReturnValue("test-access-token"),
  encryptSecret: vi.fn().mockReturnValue("encrypted"),
}));

vi.mock("../phone-verification/phone-verification.policy.js", () => ({
  assertCanSendMessages: vi.fn(),
  loadUserMessagingGate: vi.fn().mockResolvedValue({
    id: "buyer-1",
    role: "BUYER",
    phoneNumber: "+905551111111",
    phoneVerificationStatus: "PHONE_VERIFIED",
  }),
}));

describe("UnifiedMessagingService", () => {
  const tx = {
    workspaceMessage: { create: vi.fn() },
    workspaceConversation: { update: vi.fn() },
    messagingOutboxEvent: { create: vi.fn().mockResolvedValue({ id: "o1" }) },
  };

  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    workspaceConversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    workspaceParticipant: { findMany: vi.fn().mockResolvedValue([]) },
    rfqDetails: { findUnique: vi.fn().mockResolvedValue(null) },
    supplierAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "admin-1",
        role: "ADMIN",
        phoneNumber: null,
        phoneVerificationStatus: "PHONE_VERIFIED",
      }),
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
    whatsAppBusinessConnection: {
      findUnique: vi.fn().mockResolvedValue({
        buyerId: "buyer-1",
        phoneNumberId: "111111111111111",
        encryptedAccessToken: "encrypted",
        displayPhoneNumber: "+90 532 111 1111",
        wabaId: "waba-a",
        metaBusinessId: "biz-a",
        verifiedName: "Buyer",
        status: "CONNECTED",
        tokenExpiresAt: new Date(Date.now() + 86400000),
      }),
      update: vi.fn(),
      updateMany: vi.fn(),
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

  it("supplier RFQ reply uses Workspace channel (not WhatsApp outbound)", async () => {
    const svc = new UnifiedMessagingService(prisma as never);
    prisma.workspaceConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      participants: [
        { userId: buyer.id, phoneE164: "+905551111111", leftAt: null, participantRole: "OWNER" },
        { userId: supplier.id, phoneE164: "+905322222222", leftAt: null, participantRole: "COUNTERPARTY" },
      ],
      contexts: [{ contextType: "RFQ", contextId: "ws-1" }],
      metadata: {},
    });
    prisma.workspaceConversationParticipant.findFirst.mockResolvedValue({
      id: "p-supplier",
      userId: supplier.id,
    });
    tx.workspaceMessage.create.mockResolvedValue({
      id: "msg-supplier",
      conversationId: "conv-1",
      authorUserId: supplier.id,
      messageType: "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      audienceScope: "EXTERNAL",
      direction: "OUTBOUND",
      channelSource: "WORKSPACE",
      body: "hello",
      status: "ACTIVE",
      parentMessageId: null,
      externalMessageId: null,
      whatsappMessageId: null,
      createdAt: new Date(),
      sentAt: new Date(),
      deliveredAt: null,
      readAt: null,
      failedAt: null,
    });
    prisma.workspaceMessage.update = vi.fn();
    const result = await svc.createMessage(supplier, "conv-1", { body: "hello" });
    expect(result.message.channelSource ?? result.message.channel).toBeDefined();
    expect(tx.workspaceMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channelSource: "WORKSPACE" }),
      }),
    );
    expect(prisma.workspaceMessage.update).not.toHaveBeenCalled();
  });

  it("buyer RFQ message defaults to workspace when WhatsApp missing", async () => {
    const svc = new UnifiedMessagingService(prisma as never);
    prisma.workspaceConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      participants: [{ userId: buyer.id, phoneE164: null, leftAt: null, participantRole: "OWNER" }],
      contexts: [{ contextType: "RFQ", contextId: "ws-1" }],
      metadata: {},
    });
    prisma.workspaceConversationParticipant.findFirst.mockResolvedValue({
      id: "p-buyer",
      userId: buyer.id,
    });
    prisma.workspaceParticipant = {
      findMany: vi.fn().mockResolvedValue([
        { userId: buyer.id, participantRole: "OWNER", user: { whatsappPhone: null } },
        { userId: supplier.id, participantRole: "COUNTERPARTY", user: { whatsappPhone: null } },
      ]),
    };
    prisma.rfqDetails = { findUnique: vi.fn().mockResolvedValue({ selectedSupplierUserId: supplier.id }) };
    prisma.user = {
      findUnique: vi.fn().mockResolvedValue({ whatsappPhone: null, phoneNumber: "+905551111111" }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: buyer.id,
        role: "BUYER",
        phoneNumber: null,
        phoneVerificationStatus: null,
      }),
    };
    prisma.supplierAssignment = { findMany: vi.fn().mockResolvedValue([]) };
    tx.workspaceMessage.create.mockResolvedValue({
      id: "msg-buyer",
      conversationId: "conv-1",
      authorUserId: buyer.id,
      messageType: "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      audienceScope: "EXTERNAL",
      direction: "OUTBOUND",
      channelSource: "WORKSPACE",
      body: "hello",
      status: "ACTIVE",
      parentMessageId: null,
      externalMessageId: null,
      whatsappMessageId: null,
      createdAt: new Date(),
      sentAt: new Date(),
      deliveredAt: null,
      readAt: null,
      failedAt: null,
    });
    prisma.workspaceMessage.update = vi.fn();

    const result = await svc.createMessage(buyer, "conv-1", { body: "hello" });
    expect(result.message).toBeDefined();
    expect(tx.workspaceMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channelSource: "WORKSPACE" }),
      }),
    );
  });

  it("rejects whatsapp channel when no counterparty phone", async () => {
    const svc = new UnifiedMessagingService(prisma as never);
    prisma.workspaceConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      participants: [{ userId: admin.id, phoneE164: null, leftAt: null }],
    });
    tx.workspaceMessage.create.mockResolvedValue({
      id: "msg-2",
      conversationId: "conv-1",
      authorUserId: admin.id,
      messageType: "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      audienceScope: "EXTERNAL",
      direction: "OUTBOUND",
      channelSource: "WORKSPACE",
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
    prisma.workspaceMessage.update = vi.fn();
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
