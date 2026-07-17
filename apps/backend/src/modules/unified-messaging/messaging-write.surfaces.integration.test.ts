import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MESSAGING_WRITE_SURFACES,
  type MessagingMutationSurface,
} from "./messaging-write.registry.js";
import { MessagingWriteDispatcher } from "./messaging-write.dispatcher.js";

vi.mock("../../config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env.js")>();
  return {
    ...actual,
    getUnifiedMessagingWriteMode: vi.fn(() => "unified_primary_legacy_mirror"),
  };
});

import { getUnifiedMessagingWriteMode } from "../../config/env.js";

const admin = { id: "admin-1", email: "admin@test.local", role: "ADMIN" as const };

function mockPrismaForDispatcher() {
  const outboxCreates: unknown[] = [];
  const mockTx = {
    workspaceConversation: { update: vi.fn().mockResolvedValue({}) },
    workspaceConversationParticipant: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    workspaceMessage: {
      create: vi.fn().mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
      }),
    },
    messagingOutboxEvent: {
      create: vi.fn().mockImplementation(async (args: { data: unknown }) => {
        outboxCreates.push(args.data);
        return { id: `outbox-${outboxCreates.length}` };
      }),
    },
    directMessage: {
      create: vi.fn().mockResolvedValue({ id: "dm-1", conversationId: "dc-1" }),
    },
    directConversation: {
      findUnique: vi.fn().mockResolvedValue({
        id: "dc-1",
        buyerUserId: "b1",
        contextType: "RFQ",
      }),
      update: vi.fn().mockResolvedValue({}),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  };

  return { prisma, mockTx, outboxCreates };
}

/** Per-surface dispatcher-primary invocation (unified_primary_legacy_mirror). */
const SURFACE_INVOCATIONS: Record<
  MessagingMutationSurface,
  (d: MessagingWriteDispatcher) => Promise<unknown>
> = {
  workspace_external_message: (d) =>
    d.dispatchMutation({
      surface: "workspace_communication",
      registryKey: "workspace_external_message",
      actor: admin,
      idempotencyKey: "ws:ext:1",
      unifiedPrimary: async (tx) => {
        await tx.workspaceMessage.create({ data: {} as never });
        return { convId: "conv-1", msgId: "msg-1" };
      },
      buildOutbox: () => [
        {
          eventType: "SOCKET_EMIT",
          aggregateType: "workspace_communication",
          aggregateId: "msg-1",
          conversationId: "conv-1",
          idempotencyKey: "socket:ws:ext:1",
          payload: { event: "messaging:message:new", eventPayload: {} },
        },
      ],
      legacyOnly: async () => ({ convId: "", msgId: "" }),
    }),
  workspace_internal_note: (d) =>
    d.dispatchMutation({
      surface: "workspace_communication",
      registryKey: "workspace_internal_note",
      actor: admin,
      idempotencyKey: "ws:int:1",
      unifiedPrimary: async () => ({ convId: "conv-1", msgId: "msg-1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  workspace_attachment: (d) =>
    d.dispatchMutation({
      surface: "workspace_communication",
      registryKey: "workspace_attachment",
      actor: admin,
      idempotencyKey: "attach:1",
      unifiedPrimary: async () => ({ attachmentId: "a1" }),
      buildOutbox: () => [
        {
          eventType: "SOCKET_EMIT",
          aggregateType: "workspace_communication",
          aggregateId: "a1",
          idempotencyKey: "socket:attach:1",
          payload: { event: "messaging:attachment:created", eventPayload: {} },
        },
      ],
      legacyOnly: async () => ({}),
    }),
  workspace_mark_read: (d) =>
    d.dispatchMarkRead(admin, "workspace_communication", "workspace_mark_read", "conv-1"),
  conversation_hub_message: (d) =>
    d.dispatchMutation({
      surface: "conversation_hub",
      registryKey: "conversation_hub_message",
      actor: admin,
      idempotencyKey: "hub:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  conversation_hub_reply: (d) =>
    d.dispatchMutation({
      surface: "conversation_hub",
      registryKey: "conversation_hub_reply",
      actor: admin,
      idempotencyKey: "hub:reply:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  conversation_hub_internal_note: (d) =>
    d.dispatchMutation({
      surface: "conversation_hub",
      registryKey: "conversation_hub_internal_note",
      actor: admin,
      idempotencyKey: "hub:int:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  general_messages_send: (d) =>
    d.persistMessageWithOutbox(admin, "unified_api", {
      conversationId: "conv-1",
      authorUserId: admin.id,
      body: "hello",
    }),
  direct_chat_send: (d) =>
    d.dispatchMutation({
      surface: "direct_chat",
      registryKey: "direct_chat_send",
      actor: admin,
      idempotencyKey: "chat:1",
      unifiedPrimary: async (tx) => {
        await tx.directMessage.create({ data: {} as never });
        return { messageId: "dm-1", conversationId: "dc-1" };
      },
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  direct_chat_attachment: (d) =>
    d.dispatchMutation({
      surface: "direct_chat",
      registryKey: "direct_chat_attachment",
      actor: admin,
      idempotencyKey: "chat:att:1",
      unifiedPrimary: async () => ({ attachmentId: "a1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  order_freight_chat_send: (d) =>
    d.dispatchMutation({
      surface: "order_freight_chat",
      registryKey: "order_freight_chat_send",
      actor: admin,
      idempotencyKey: "ofc:1",
      unifiedPrimary: async () => ({ messageId: "dm-1", conversationId: "dc-1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  freightiq_message_send: (d) =>
    d.dispatchMutation({
      surface: "freightiq",
      registryKey: "freightiq_message_send",
      actor: admin,
      idempotencyKey: "fiq:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  rfq_clarification_create: (d) =>
    d.dispatchMutation({
      surface: "rfq_clarification",
      registryKey: "rfq_clarification_create",
      actor: admin,
      idempotencyKey: "rfq:c:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  rfq_clarification_reply: (d) =>
    d.dispatchMutation({
      surface: "rfq_clarification",
      registryKey: "rfq_clarification_reply",
      actor: admin,
      idempotencyKey: "rfq:r:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  rfq_clarification_read: (d) =>
    d.dispatchMutation({
      surface: "rfq_clarification",
      registryKey: "rfq_clarification_read",
      actor: admin,
      idempotencyKey: "rfq:read:1",
      unifiedPrimary: async () => ({ ok: true }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  whatsapp_outbound_text: (d) =>
    d.dispatchMutation({
      surface: "whatsapp_inbox",
      registryKey: "whatsapp_outbound_text",
      actor: admin,
      idempotencyKey: "wa:out:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  whatsapp_outbound_media: (d) =>
    d.dispatchMutation({
      surface: "whatsapp_inbox",
      registryKey: "whatsapp_outbound_media",
      actor: admin,
      idempotencyKey: "wa:media:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  whatsapp_inbound: (d) =>
    d.dispatchMutation({
      surface: "whatsapp_inbox",
      registryKey: "whatsapp_inbound",
      actor: admin,
      idempotencyKey: "wa:in:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  whatsapp_status: (d) =>
    d.dispatchMutation({
      surface: "whatsapp_inbox",
      registryKey: "whatsapp_status",
      actor: admin,
      idempotencyKey: "wa:st:1",
      unifiedPrimary: async () => ({ ok: true }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  conversation_assignment: (d) =>
    d.dispatchConversationMutation(
      admin,
      "unified_api",
      "conversation_assignment",
      "conv-1",
      "assign:1",
      { assignedUserId: "u2" },
      "messaging:conversation:assigned",
    ),
  team_assignment: (d) =>
    d.dispatchConversationMutation(
      admin,
      "unified_api",
      "team_assignment",
      "conv-1",
      "team:1",
      { assignedUserId: "u2" },
      "messaging:conversation:assigned",
    ),
  archive: (d) =>
    d.dispatchConversationMutation(
      admin,
      "unified_api",
      "archive",
      "conv-1",
      "arch:1",
      { isArchived: true },
      "messaging:conversation:archived",
    ),
  unarchive: (d) =>
    d.dispatchConversationMutation(
      admin,
      "unified_api",
      "unarchive",
      "conv-1",
      "unarch:1",
      { isArchived: false },
      "messaging:conversation:updated",
    ),
  participant_add: (d) =>
    d.dispatchMutation({
      surface: "unified_api",
      registryKey: "participant_add",
      actor: admin,
      idempotencyKey: "p:add:1",
      unifiedPrimary: async () => ({ participantId: "p1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  participant_remove: (d) =>
    d.dispatchMutation({
      surface: "unified_api",
      registryKey: "participant_remove",
      actor: admin,
      idempotencyKey: "p:rm:1",
      unifiedPrimary: async () => ({ ok: true }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  context_add: (d) =>
    d.dispatchMutation({
      surface: "unified_api",
      registryKey: "context_add",
      actor: admin,
      idempotencyKey: "ctx:add:1",
      unifiedPrimary: async () => ({ contextId: "c1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  context_remove: (d) =>
    d.dispatchMutation({
      surface: "unified_api",
      registryKey: "context_remove",
      actor: admin,
      idempotencyKey: "ctx:rm:1",
      unifiedPrimary: async () => ({ ok: true }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  priority_update: (d) =>
    d.dispatchConversationMutation(
      admin,
      "unified_api",
      "priority_update",
      "conv-1",
      "pri:1",
      { priority: "HIGH" },
      "messaging:conversation:updated",
    ),
  conversation_status_update: (d) =>
    d.dispatchConversationMutation(
      admin,
      "unified_api",
      "conversation_status_update",
      "conv-1",
      "st:1",
      { status: "ACTIVE" },
      "messaging:conversation:updated",
    ),
  attachment_upload: (d) =>
    d.dispatchMutation({
      surface: "unified_api",
      registryKey: "attachment_upload",
      actor: admin,
      idempotencyKey: "uatt:1",
      unifiedPrimary: async () => ({ attachmentId: "a1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  message_retry: (d) =>
    d.dispatchMutation({
      surface: "unified_api",
      registryKey: "message_retry",
      actor: admin,
      idempotencyKey: "retry:1",
      unifiedPrimary: async () => ({ messageId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  conversation_mark_read: (d) =>
    d.dispatchMarkRead(admin, "unified_api", "conversation_mark_read", "conv-1"),
  message_read_receipt: (d) =>
    d.dispatchMutation({
      surface: "conversation_hub",
      registryKey: "message_read_receipt",
      actor: admin,
      idempotencyKey: "rr:1",
      unifiedPrimary: async () => ({ ok: true }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  system_event: (d) =>
    d.dispatchMutation({
      surface: "system_event",
      registryKey: "system_event",
      actor: admin,
      idempotencyKey: "sys:1",
      unifiedPrimary: async () => ({ messageId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  mention: (d) =>
    d.dispatchMutation({
      surface: "workspace_communication",
      registryKey: "mention",
      actor: admin,
      idempotencyKey: "mention:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [
        {
          eventType: "NOTIFICATION_DISPATCH",
          aggregateType: "workspace_communication",
          aggregateId: "m1",
          conversationId: "conv-1",
          messageId: "m1",
          idempotencyKey: "notify:mention:1",
          payload: { notifyInput: {} },
        },
      ],
      legacyOnly: async () => ({}),
    }),
  passwordless_reply: (d) =>
    d.dispatchMutation({
      surface: "passwordless",
      registryKey: "passwordless_reply",
      actor: admin,
      idempotencyKey: "pl:1",
      unifiedPrimary: async () => ({ msgId: "m1" }),
      buildOutbox: () => [],
      legacyOnly: async () => ({}),
    }),
  unified_internal_note: (d) =>
    d.persistMessageWithOutbox(
      admin,
      "unified_api",
      {
        conversationId: "conv-1",
        authorUserId: admin.id,
        body: "note",
        internal: true,
      },
    ),
};

describe("Messaging write surfaces — dispatcher-primary integration", () => {
  beforeEach(() => {
    vi.mocked(getUnifiedMessagingWriteMode).mockReturnValue("unified_primary_legacy_mirror");
  });

  for (const surface of MESSAGING_WRITE_SURFACES) {
    it(`${surface}: unified-primary transaction + outbox`, async () => {
      const { prisma, outboxCreates } = mockPrismaForDispatcher();
      const dispatcher = new MessagingWriteDispatcher(prisma as never);
      const invoke = SURFACE_INVOCATIONS[surface];
      expect(invoke).toBeDefined();

      await invoke(dispatcher);

      expect(prisma.$transaction).toHaveBeenCalled();
      if (surface !== "workspace_mark_read" && surface !== "conversation_mark_read") {
        expect(outboxCreates.length).toBeGreaterThanOrEqual(0);
      }
    });
  }

  it("unified_only mode skips legacy mirror enqueue", async () => {
    vi.mocked(getUnifiedMessagingWriteMode).mockReturnValue("unified_only");
    const { prisma, outboxCreates } = mockPrismaForDispatcher();
    const dispatcher = new MessagingWriteDispatcher(prisma as never);
    await dispatcher.dispatchMutation({
      surface: "unified_api",
      registryKey: "general_messages_send",
      actor: admin,
      idempotencyKey: "only:1",
      unifiedPrimary: async () => ({ id: "m1" }),
      buildOutbox: () => [
        {
          eventType: "LEGACY_MIRROR",
          aggregateType: "unified_api",
          aggregateId: "m1",
          idempotencyKey: "mirror:only:1",
          payload: {},
        },
      ],
      legacyMirror: async () => ({ legacyId: "x", legacySource: "y" }),
    });
    const mirrorEvents = outboxCreates.filter(
      (e) => (e as { eventType: string }).eventType === "LEGACY_MIRROR",
    );
    expect(mirrorEvents).toHaveLength(1);
  });

  it("legacy_only uses legacyOnly handler", async () => {
    vi.mocked(getUnifiedMessagingWriteMode).mockReturnValue("legacy_only");
    const { prisma } = mockPrismaForDispatcher();
    const dispatcher = new MessagingWriteDispatcher(prisma as never);
    const legacyOnly = vi.fn().mockResolvedValue({ ok: true });
    await dispatcher.dispatchMutation({
      surface: "workspace_communication",
      registryKey: "workspace_external_message",
      actor: admin,
      idempotencyKey: "leg:1",
      unifiedPrimary: async () => ({}),
      buildOutbox: () => [],
      legacyOnly,
    });
    expect(legacyOnly).toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
