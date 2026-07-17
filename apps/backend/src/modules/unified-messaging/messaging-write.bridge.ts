import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { logger } from "../../config/logger.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { UnifiedMessagingWriteOrchestrator } from "./unified-messaging-write.orchestrator.js";
import { participantKeyForUser } from "./unified-messaging.constants.js";
import type { AuthUser } from "./unified-messaging.types.js";
import { getMessagingDedupStore } from "./messaging-dedup.store.js";
import { getMessagingOutboxService } from "./messaging-outbox.service.js";
import { getMessagingWriteDispatcher } from "./messaging-write.dispatcher.js";

export type MessagingWriteSurface =
  | "workspace_communication"
  | "conversation_hub"
  | "direct_chat"
  | "whatsapp_inbox"
  | "rfq_clarification"
  | "freightiq"
  | "system_event"
  | "passwordless"
  | "unified_api"
  | "general_messages"
  | "order_freight_chat";

const emittedEventKeys = new Set<string>();

export function resetMessagingEventDedupForTests() {
  emittedEventKeys.clear();
}

function eventKey(parts: string[]) {
  return createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 24);
}

export class MessagingEventEmitter {
  constructor(private readonly prisma: PrismaClient) {}

  emit(
    event:
      | "messaging:conversation:new"
      | "messaging:conversation:updated"
      | "messaging:message:new"
      | "messaging:message:updated"
      | "messaging:message:status"
      | "messaging:conversation:read"
      | "messaging:conversation:assigned"
      | "messaging:conversation:archived"
      | "messaging:participant:updated"
      | "messaging:context:updated"
      | "messaging:attachment:created"
      | "messaging:typing",
    payload: {
      conversationId: string;
      messageId?: string;
      workspaceId?: string;
      audienceScope?: string;
      idempotencyKey?: string;
    },
  ) {
    const dedupeKey = payload.idempotencyKey ?? eventKey([
      event,
      payload.conversationId,
      payload.messageId ?? "",
    ]);

    void this.emitOnce(event, payload, dedupeKey);
  }

  private async emitOnce(
    event: Parameters<MessagingEventEmitter["emit"]>[0],
    payload: Parameters<MessagingEventEmitter["emit"]>[1],
    dedupeKey: string,
  ) {
    if (emittedEventKeys.has(dedupeKey)) return;
    const claimed = await getMessagingDedupStore(this.prisma).claim("socket", dedupeKey);
    if (!claimed) return;
    emittedEventKeys.add(dedupeKey);
    setTimeout(() => emittedEventKeys.delete(dedupeKey), 60_000);

    socketBus.scheduleEmit(() => {
      const room = `messaging:conversation:${payload.conversationId}`;
      socketBus.emitToRoom(room, event, {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        workspaceId: payload.workspaceId,
        idempotencyKey: dedupeKey,
      });
      if (payload.workspaceId) {
        socketBus.emitToWorkspace(payload.workspaceId, event, { ...payload, idempotencyKey: dedupeKey });
      }
    });
  }
}

export class MessagingNotificationDedup {
  constructor(private readonly prisma: PrismaClient) {}

  async shouldNotify(input: {
    eventType: string;
    conversationId: string;
    messageId: string;
    recipientId: string;
  }): Promise<boolean> {
    const key = `messaging:${input.eventType}:${input.conversationId}:${input.messageId}:${input.recipientId}`;
    return getMessagingDedupStore(this.prisma).claim("notification", key);
  }

  messagingDedupMetadata(eventType: string, conversationId: string, messageId: string, recipientId: string) {
    const key = `messaging:${eventType}:${conversationId}:${messageId}:${recipientId}`;
    return { messagingDedupKey: createHash("sha256").update(key).digest("hex").slice(0, 32) };
  }
}

export class MessagingWriteBridge {
  private readonly orchestrator: UnifiedMessagingWriteOrchestrator;
  private readonly events: MessagingEventEmitter;
  readonly notifications: MessagingNotificationDedup;
  private readonly outbox: ReturnType<typeof getMessagingOutboxService>;
  private readonly dispatcher: ReturnType<typeof getMessagingWriteDispatcher>;

  constructor(private readonly prisma: PrismaClient) {
    this.orchestrator = new UnifiedMessagingWriteOrchestrator(prisma);
    this.events = new MessagingEventEmitter(prisma);
    this.notifications = new MessagingNotificationDedup(prisma);
    this.outbox = getMessagingOutboxService(prisma);
    this.dispatcher = getMessagingWriteDispatcher(prisma);
  }

  get dispatcherInstance() {
    return this.dispatcher;
  }

  get writeMode() {
    return this.orchestrator.writeMode;
  }

  publishEvent(
    event: Parameters<MessagingEventEmitter["emit"]>[0],
    payload: Parameters<MessagingEventEmitter["emit"]>[1],
  ) {
    this.events.emit(event, payload);
  }

  /** Execute legacy write; mirror + events via outbox on failure. */
  async runLegacyWrite<T>(input: {
    surface: MessagingWriteSurface;
    actor: AuthUser;
    legacy: () => Promise<T>;
    afterLegacy?: (result: T) => Promise<void>;
    mirrorOnFailure?: (result: T) => {
      idempotencyKey: string;
      conversationId?: string;
      messageId?: string;
      payload: Record<string, unknown>;
    };
  }): Promise<T> {
    const result = await input.legacy();
    try {
      if (input.afterLegacy) await input.afterLegacy(result);
    } catch (err) {
      logger.warn({ err: String(err), surface: input.surface }, "messaging write bridge afterLegacy failed");
      if (input.mirrorOnFailure) {
        const m = input.mirrorOnFailure(result);
        await this.outbox.enqueue({
          eventType: "LEGACY_MIRROR",
          aggregateType: input.surface,
          aggregateId: m.messageId ?? m.idempotencyKey,
          conversationId: m.conversationId,
          messageId: m.messageId,
          idempotencyKey: `mirror:${m.idempotencyKey}`,
          payload: m.payload,
        });
      }
    }
    return result;
  }

  async onWorkspaceMessageCreated(input: {
    actor: AuthUser;
    workspaceType: string;
    workspaceId: string;
    auditWorkspaceId: string;
    messageId: string;
    body: string;
    messageType: string;
    visibility: string;
    clientMessageId?: string | null;
    legacySource?: string;
  }) {
    const conv = await this.prisma.workspaceConversation.findUnique({
      where: { workspaceType_workspaceId: { workspaceType: input.workspaceType, workspaceId: input.workspaceId } },
    });
    if (!conv) return;

    const isInternal =
      input.messageType === "INTERNAL_NOTE" ||
      input.visibility === "ADMIN_ONLY";

    if (this.writeMode === "legacy_primary_unified_mirror") {
      try {
        const legacy = { legacyId: input.messageId, legacySource: input.legacySource ?? "workspace" };
        if (isInternal) {
          await this.orchestrator.mirrorFromLegacy(input.actor, {
            conversationId: conv.id,
            authorUserId: input.actor.id,
            body: input.body,
            messageType: "INTERNAL_NOTE",
            visibility: "ADMIN_ONLY",
          }, legacy);
        } else {
          await this.orchestrator.mirrorFromLegacy(input.actor, {
            conversationId: conv.id,
            authorUserId: input.actor.id,
            body: input.body,
            messageType: input.messageType,
            visibility: input.visibility,
            clientMessageId: input.clientMessageId ?? undefined,
          }, legacy);
        }
      } catch (err) {
        logger.warn({ err: String(err), surface: "workspace_communication" }, "unified mirror failed");
      }
    } else if (this.writeMode === "unified_primary_legacy_mirror" || this.writeMode === "unified_only") {
      try {
        if (isInternal) {
          await this.orchestrator.createInternalNote(input.actor, {
            conversationId: conv.id,
            authorUserId: input.actor.id,
            body: input.body,
          });
        } else {
          await this.orchestrator.createExternalMessage(input.actor, {
            conversationId: conv.id,
            authorUserId: input.actor.id,
            body: input.body,
            messageType: input.messageType,
            visibility: input.visibility,
            clientMessageId: input.clientMessageId ?? undefined,
          });
        }
      } catch (err) {
        logger.warn({ err: String(err), surface: "workspace_communication" }, "unified write failed");
      }
    }

    if (!isInternal) {
      this.events.emit("messaging:message:new", {
        conversationId: conv.id,
        messageId: input.messageId,
        workspaceId: input.auditWorkspaceId,
        audienceScope: "EXTERNAL",
        idempotencyKey: input.clientMessageId ?? input.messageId,
      });
    } else {
      this.events.emit("messaging:message:new", {
        conversationId: conv.id,
        messageId: input.messageId,
        workspaceId: input.auditWorkspaceId,
        audienceScope: "INTERNAL",
        idempotencyKey: input.messageId,
      });
    }
  }

  async onDirectMessageCreated(input: {
    actor: AuthUser;
    directConversationId: string;
    messageId: string;
    body: string;
    source: string;
    channel?: "WORKSPACE" | "WHATSAPP";
    clientMessageId?: string | null;
    whatsappMessageId?: string | null;
  }) {
    let unifiedConv = await this.prisma.workspaceConversation.findFirst({
      where: { metadata: { path: ["legacyDirectConversationId"], equals: input.directConversationId } },
    });

    const direct = await this.prisma.directConversation.findUnique({
      where: { id: input.directConversationId },
    });

    if (!unifiedConv && direct) {
      const contextType =
        direct.contextType === "ORDER_FREIGHT" ? "FREIGHT" : direct.contextType;
      unifiedConv = await this.prisma.workspaceConversation.findFirst({
        where: {
          contexts: {
            some: { contextType, contextId: direct.contextWorkspaceId },
          },
        },
      });
    }

    if (!unifiedConv && direct && this.writeMode !== "legacy_only") {
      const contextType =
        direct.contextType === "ORDER_FREIGHT" ? "FREIGHT" : direct.contextType;
      unifiedConv = await this.prisma.workspaceConversation.create({
        data: {
          workspaceType: "DIRECT_CHAT",
          workspaceId: input.directConversationId,
          primaryChannel: input.source === "whatsapp" ? "WHATSAPP" : "WORKSPACE",
          metadata: { legacyDirectConversationId: input.directConversationId },
          contexts: direct.contextWorkspaceId
            ? {
                create: {
                  contextType,
                  contextId: direct.contextWorkspaceId,
                  contextReference: direct.contextRef,
                },
              }
            : undefined,
        },
      });
    }

    const channel = input.channel ?? (input.source === "whatsapp" ? "WHATSAPP" : "WORKSPACE");
    const legacy = { legacyId: input.messageId, legacySource: "direct_chat" };

    if (unifiedConv && this.writeMode === "legacy_primary_unified_mirror") {
      try {
        await this.orchestrator.mirrorFromLegacy(
          input.actor,
          {
            conversationId: unifiedConv.id,
            authorUserId: input.actor.id,
            body: input.body,
            channel,
            clientMessageId: input.clientMessageId ?? undefined,
          },
          legacy,
        );
      } catch (err) {
        logger.warn({ err: String(err), surface: "direct_chat" }, "unified mirror failed");
      }
    } else if (unifiedConv && (this.writeMode === "unified_primary_legacy_mirror" || this.writeMode === "unified_only")) {
      try {
        await this.orchestrator.createExternalMessage(input.actor, {
          conversationId: unifiedConv.id,
          authorUserId: input.actor.id,
          body: input.body,
          channel,
          clientMessageId: input.clientMessageId ?? undefined,
          legacyMirror: async () => legacy,
        });
      } catch (err) {
        logger.warn({ err: String(err), surface: "direct_chat" }, "unified write failed");
      }
    }

    if (unifiedConv) {
      this.events.emit("messaging:message:new", {
        conversationId: unifiedConv.id,
        messageId: input.messageId,
        idempotencyKey: input.whatsappMessageId ?? input.clientMessageId ?? input.messageId,
      });
    }
  }

  async onWhatsAppMessageCreated(input: {
    actor: AuthUser;
    whatsappConversationId: string;
    messageId: string;
    direction: string;
    metaMessageId?: string | null;
  }) {
    const unifiedConv = await this.prisma.workspaceConversation.findFirst({
      where: { metadata: { path: ["whatsappConversationId"], equals: input.whatsappConversationId } },
    });

    if (this.writeMode !== "legacy_only" && unifiedConv) {
      try {
        await this.orchestrator.createExternalMessage(input.actor, {
          conversationId: unifiedConv.id,
          authorUserId: input.actor.id,
          body: "",
          channel: "WHATSAPP",
          legacyMirror: async () => ({
            legacyId: input.messageId,
            legacySource: "whatsapp",
          }),
        });
      } catch {
        /* mirror optional */
      }
    }

    const convId = unifiedConv?.id ?? input.whatsappConversationId;
    this.events.emit("messaging:message:new", {
      conversationId: convId,
      messageId: input.messageId,
      idempotencyKey: input.metaMessageId ?? input.messageId,
    });
  }

  async onConversationRead(input: {
    actor: AuthUser;
    conversationId: string;
    workspaceId?: string;
  }) {
    if (this.writeMode === "unified_primary_legacy_mirror" || this.writeMode === "unified_only") {
      try {
        await this.prisma.workspaceConversationParticipant.updateMany({
          where: { conversationId: input.conversationId, userId: input.actor.id },
          data: { lastReadAt: new Date() },
        });
      } catch {
        /* optional */
      }
    }
    this.events.emit("messaging:conversation:read", {
      conversationId: input.conversationId,
      workspaceId: input.workspaceId,
      idempotencyKey: `${input.conversationId}:${input.actor.id}:read`,
    });
  }

  async onAssignment(input: { conversationId: string; assignedUserId: string }) {
    this.events.emit("messaging:conversation:assigned", {
      conversationId: input.conversationId,
      idempotencyKey: `${input.conversationId}:assign:${input.assignedUserId}`,
    });
  }

  async onArchive(input: { conversationId: string }) {
    this.events.emit("messaging:conversation:archived", {
      conversationId: input.conversationId,
      idempotencyKey: `${input.conversationId}:archive`,
    });
  }

  async onWhatsAppInbound(input: {
    whatsappConversationId: string;
    messageId: string;
    metaMessageId?: string | null;
    duplicate?: boolean;
  }) {
    if (input.duplicate) return;
    const unifiedConv = await this.prisma.workspaceConversation.findFirst({
      where: { metadata: { path: ["whatsappConversationId"], equals: input.whatsappConversationId } },
    });
    const convId = unifiedConv?.id ?? input.whatsappConversationId;
    this.events.emit("messaging:message:new", {
      conversationId: convId,
      messageId: input.messageId,
      idempotencyKey: input.metaMessageId ?? `inbound:${input.messageId}`,
    });
  }

  async onAttachmentCreated(input: {
    conversationId: string;
    messageId?: string;
    attachmentId: string;
  }) {
    this.events.emit("messaging:attachment:created", {
      conversationId: input.conversationId,
      messageId: input.messageId,
      idempotencyKey: `attach:${input.attachmentId}`,
    });
  }

  async onSystemMessage(input: {
    actor?: AuthUser;
    workspaceType: string;
    workspaceId: string;
    auditWorkspaceId: string;
    messageId: string;
    body: string;
    systemEventKey?: string;
  }) {
    const conv = await this.prisma.workspaceConversation.findUnique({
      where: { workspaceType_workspaceId: { workspaceType: input.workspaceType, workspaceId: input.workspaceId } },
    });
    if (!conv) return;

    const actor = input.actor ?? { id: "system", email: "", role: "SYSTEM" };
    const legacy = { legacyId: input.messageId, legacySource: "system_event" };

    if (this.writeMode !== "legacy_only") {
      try {
        await this.orchestrator.createSystemMessage(
          actor,
          {
            conversationId: conv.id,
            authorUserId: actor.id,
            body: input.body,
            systemEventKey: input.systemEventKey,
          },
          legacy,
        );
      } catch (err) {
        logger.warn({ err: String(err), surface: "system_event" }, "unified mirror failed");
      }
    }

    this.events.emit("messaging:message:new", {
      conversationId: conv.id,
      messageId: input.messageId,
      workspaceId: input.auditWorkspaceId,
      audienceScope: "SYSTEM",
      idempotencyKey: `system:${input.messageId}`,
    });
  }

  async onParticipantUpdated(input: { conversationId: string; participantId: string }) {
    this.events.emit("messaging:participant:updated", {
      conversationId: input.conversationId,
      idempotencyKey: `participant:${input.participantId}`,
    });
  }

  async onContextUpdated(input: { conversationId: string; contextId: string }) {
    this.events.emit("messaging:context:updated", {
      conversationId: input.conversationId,
      idempotencyKey: `context:${input.contextId}`,
    });
  }

  async onConversationUpdated(input: { conversationId: string; reason: string }) {
    this.events.emit("messaging:conversation:updated", {
      conversationId: input.conversationId,
      idempotencyKey: `${input.conversationId}:updated:${input.reason}`,
    });
  }

  async onDeliveryStatus(input: {
    conversationId: string;
    messageId: string;
    status: string;
  }) {
    if (this.writeMode !== "legacy_only") {
      await this.orchestrator.updateDeliveryStatus(input.messageId, input.status).catch(() => undefined);
    }
    this.events.emit("messaging:message:status", {
      conversationId: input.conversationId,
      messageId: input.messageId,
      idempotencyKey: `${input.messageId}:${input.status}`,
    });
  }

  async ensureParticipant(conversationId: string, userId: string) {
    const key = participantKeyForUser(userId);
    await this.prisma.workspaceConversationParticipant.upsert({
      where: { conversationId_participantKey: { conversationId, participantKey: key } },
      create: {
        conversationId,
        participantKey: key,
        userId,
        participantType: "USER",
        participantRole: "MEMBER",
      },
      update: { leftAt: null },
    });
  }
}

let bridge: MessagingWriteBridge | null = null;

export function getMessagingWriteBridge(prisma: PrismaClient): MessagingWriteBridge {
  if (!bridge) bridge = new MessagingWriteBridge(prisma);
  return bridge;
}
