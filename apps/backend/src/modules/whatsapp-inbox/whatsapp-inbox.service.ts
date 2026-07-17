import type { PrismaClient } from "@prisma/client";
import { AppError } from "../../utils/httpErrors.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { getMessagingWriteBridge } from "../unified-messaging/messaging-write.bridge.js";
import { registerWiredSurface } from "../unified-messaging/messaging-write.registry.js";
import { logger } from "../../config/logger.js";
import { parseInboundMessages, parseStatusUpdates } from "./whatsapp-inbox.parser.js";
import { downloadWhatsAppMedia } from "./whatsapp-inbox.media.js";
import { sendWhatsAppMessage, validateE164Phone } from "./whatsapp-inbox.send.js";
import {
  CUSTOMER_SERVICE_WINDOW_MS,
  canAccessAllWhatsAppConversations,
  type ParsedInboundMessage,
  type ParsedStatusUpdate,
  type SendMessageInput,
} from "./whatsapp-inbox.types.js";
import type { AuthUser } from "../../types/auth-user.js";

function previewForMessage(type: string, body: string | null, caption: string | null): string {
  if (body?.trim()) return body.trim().slice(0, 200);
  if (caption?.trim()) return caption.trim().slice(0, 200);
  const labels: Record<string, string> = {
    image: "📷 Image",
    document: "📄 Document",
    audio: "🎵 Audio",
    video: "🎬 Video",
    location: "📍 Location",
    contacts: "👤 Contact",
    sticker: "Sticker",
    reaction: "Reaction",
    interactive: "Interactive",
    button: "Button reply",
    unsupported: "[Unsupported]",
  };
  return labels[type] ?? `[${type}]`;
}

function mapMessageRow(m: {
  id: string;
  conversationId: string;
  metaMessageId: string | null;
  direction: string;
  type: string;
  body: string | null;
  mediaId: string | null;
  mediaStorageKey: string | null;
  mimeType: string | null;
  filename: string | null;
  caption: string | null;
  replyToMessageId: string | null;
  replyToMetaId: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  authorUserId: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  metaTimestamp: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    metaMessageId: m.metaMessageId,
    direction: m.direction,
    type: m.type,
    body: m.body,
    mediaId: m.mediaId,
    hasMedia: Boolean(m.mediaStorageKey || m.mediaId),
    mediaStorageKey: m.mediaStorageKey,
    mimeType: m.mimeType,
    filename: m.filename,
    caption: m.caption,
    replyToMessageId: m.replyToMessageId,
    replyToMetaId: m.replyToMetaId,
    status: m.status,
    errorCode: m.errorCode,
    errorMessage: m.errorMessage,
    authorUserId: m.authorUserId,
    sentAt: m.sentAt?.toISOString() ?? null,
    deliveredAt: m.deliveredAt?.toISOString() ?? null,
    readAt: m.readAt?.toISOString() ?? null,
    failedAt: m.failedAt?.toISOString() ?? null,
    metaTimestamp: m.metaTimestamp?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

function mapConversationRow(
  conv: {
    id: string;
    contactId: string;
    phoneNumberId: string | null;
    lastInboundAt: Date | null;
    lastMessageAt: Date | null;
    lastMessagePreview: string | null;
    unreadCount: number;
    status: string;
    assigneeUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    contact: { waId: string; phoneNumber: string; profileName: string | null };
  },
  serviceWindowOpen: boolean,
) {
  return {
    id: conv.id,
    contactId: conv.contactId,
    waId: conv.contact.waId,
    phoneNumber: conv.contact.phoneNumber,
    profileName: conv.contact.profileName,
    phoneNumberId: conv.phoneNumberId,
    lastInboundAt: conv.lastInboundAt?.toISOString() ?? null,
    lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: conv.lastMessagePreview,
    unreadCount: conv.unreadCount,
    status: conv.status,
    assigneeUserId: conv.assigneeUserId,
    serviceWindowOpen,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  };
}

export class WhatsAppInboxService {
  constructor(private readonly db: PrismaClient) {}

  private assertAccess(actor: AuthUser, conv?: { assigneeUserId: string | null }) {
    if (!canAccessAllWhatsAppConversations(actor.role)) {
      if (actor.role !== "SALES_CONTROL") throw new AppError(403, "FORBIDDEN");
      if (conv && conv.assigneeUserId && conv.assigneeUserId !== actor.id) {
        throw new AppError(403, "FORBIDDEN", { message: "Not assigned to this conversation" });
      }
    }
  }

  isServiceWindowOpen(lastInboundAt: Date | null): boolean {
    if (!lastInboundAt) return false;
    return Date.now() - lastInboundAt.getTime() < CUSTOMER_SERVICE_WINDOW_MS;
  }

  private emitConversationEvent(conversationId: string, event: string, payload: unknown) {
    socketBus.scheduleEmit(() => {
      socketBus.emitToRole("ADMIN", event, payload);
      socketBus.emitToRole("SUPER_ADMIN", event, payload);
      socketBus.emitToRole("OPS_MANAGER", event, payload);
      socketBus.emitToRole("SALES_CONTROL", event, payload);
      socketBus.emitToRoom(`whatsapp:conversation:${conversationId}`, event, payload);
    });
  }

  async processWebhookPayload(body: Record<string, unknown>): Promise<{ inbound: number; statuses: number }> {
    const inboundItems = parseInboundMessages(body);
    const statusItems = parseStatusUpdates(body);
    let inbound = 0;
    let statuses = 0;

    for (const item of inboundItems) {
      const result = await this.ingestInbound(item);
      if (result && !result.duplicate) inbound += 1;
    }
    for (const st of statusItems) {
      const updated = await this.applyStatusUpdate(st);
      if (updated) statuses += 1;
    }

    return { inbound, statuses };
  }

  async ingestInbound(item: ParsedInboundMessage): Promise<{ messageId: string; conversationId: string; duplicate: boolean } | null> {
    if (item.metaMessageId) {
      const dup = await this.db.whatsAppMessage.findUnique({
        where: { metaMessageId: item.metaMessageId },
        select: { id: true, conversationId: true },
      });
      if (dup) return { messageId: dup.id, conversationId: dup.conversationId, duplicate: true };
    }

    const normalized = normalizePhone(item.waId);
    if (!normalized) return null;

    let contact = await this.db.whatsAppContact.findUnique({ where: { waId: normalized } });
    if (!contact) {
      contact = await this.db.whatsAppContact.create({
        data: {
          waId: normalized,
          phoneNumber: normalized,
          profileName: item.profileName,
        },
      });
    } else if (item.profileName && item.profileName !== contact.profileName) {
      contact = await this.db.whatsAppContact.update({
        where: { id: contact.id },
        data: { profileName: item.profileName },
      });
    }

    const phoneNumberId = item.phoneNumberId ?? "default";
    let conversation = await this.db.whatsAppConversation.findUnique({
      where: { contactId_phoneNumberId: { contactId: contact.id, phoneNumberId } },
      include: { contact: true },
    });

    if (!conversation) {
      conversation = await this.db.whatsAppConversation.create({
        data: {
          contactId: contact.id,
          phoneNumberId,
          lastInboundAt: item.timestamp,
          lastMessageAt: item.timestamp,
          lastMessagePreview: previewForMessage(item.type, item.body, item.caption),
          unreadCount: 1,
        },
        include: { contact: true },
      });
    }

    let replyToMessageId: string | null = null;
    if (item.replyToMetaId) {
      const parent = await this.db.whatsAppMessage.findUnique({
        where: { metaMessageId: item.replyToMetaId },
        select: { id: true },
      });
      replyToMessageId = parent?.id ?? null;
    }

    let mediaStorageKey: string | null = null;
    let mimeType = item.mimeType;
    let filename = item.filename;
    if (item.mediaId) {
      const downloaded = await downloadWhatsAppMedia(item.mediaId, {
        filename: item.filename,
        mimeType: item.mimeType,
      });
      if (downloaded) {
        mediaStorageKey = downloaded.storageKey;
        mimeType = downloaded.mimeType;
        filename = downloaded.filename;
      }
    }

    const preview = previewForMessage(item.type, item.body, item.caption);
    const msg = await this.db.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        metaMessageId: item.metaMessageId,
        direction: "INBOUND",
        type: item.type,
        body: item.body,
        mediaId: item.mediaId,
        mediaStorageKey,
        mimeType,
        filename,
        caption: item.caption,
        replyToMessageId,
        replyToMetaId: item.replyToMetaId,
        status: "received",
        metaTimestamp: item.timestamp,
      },
    });

    conversation = await this.db.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        lastInboundAt: item.timestamp,
        lastMessageAt: item.timestamp,
        lastMessagePreview: preview,
        unreadCount: { increment: 1 },
      },
      include: { contact: true },
    });

    const messageDto = mapMessageRow(msg);
    const convDto = mapConversationRow(conversation, true);

    this.emitConversationEvent(conversation.id, "whatsapp:message:new", {
      conversationId: conversation.id,
      message: messageDto,
      conversation: convDto,
    });
    this.emitConversationEvent(conversation.id, "whatsapp:conversation:updated", convDto);

    void getMessagingWriteBridge(this.db)
      .onWhatsAppInbound({
        whatsappConversationId: conversation.id,
        messageId: msg.id,
        metaMessageId: item.metaMessageId,
        duplicate: false,
      })
      .catch(() => undefined);

    return { messageId: msg.id, conversationId: conversation.id, duplicate: false };
  }

  async applyStatusUpdate(st: ParsedStatusUpdate): Promise<boolean> {
    const msg = await this.db.whatsAppMessage.findUnique({
      where: { metaMessageId: st.metaMessageId },
    });
    if (!msg || msg.direction !== "OUTBOUND") return false;

    const update: Record<string, unknown> = { status: st.status };
    if (st.status === "sent") update.sentAt = st.timestamp;
    if (st.status === "delivered") update.deliveredAt = st.timestamp;
    if (st.status === "read") update.readAt = st.timestamp;
    if (st.status === "failed") {
      update.failedAt = st.timestamp;
      update.errorCode = st.errorCode;
      update.errorMessage = st.errorMessage ?? st.errorTitle;
    }

    const updated = await this.db.whatsAppMessage.update({ where: { id: msg.id }, data: update });
    await this.db.whatsAppMessageStatus.create({
      data: {
        messageId: msg.id,
        status: st.status,
        errorCode: st.errorCode,
        errorTitle: st.errorTitle,
        errorMessage: st.errorMessage,
        raw: st.raw as object,
        occurredAt: st.timestamp,
      },
    });

    const messageDto = mapMessageRow(updated);
    this.emitConversationEvent(msg.conversationId, "whatsapp:message:status", {
      conversationId: msg.conversationId,
      messageId: msg.id,
      status: st.status,
      message: messageDto,
    });

    const unifiedConv = await this.db.workspaceConversation.findFirst({
      where: { metadata: { path: ["whatsappConversationId"], equals: msg.conversationId } },
      select: { id: true },
    });
    void getMessagingWriteBridge(this.db)
      .onDeliveryStatus({
        conversationId: unifiedConv?.id ?? msg.conversationId,
        messageId: msg.id,
        status: st.status,
      })
      .catch(() => undefined);

    return true;
  }

  async listConversations(actor: AuthUser, opts?: { cursor?: string; limit?: number }) {
    this.assertAccess(actor);
    const limit = Math.min(opts?.limit ?? 50, 100);
    const where = canAccessAllWhatsAppConversations(actor.role)
      ? {}
      : actor.role === "SALES_CONTROL"
        ? { OR: [{ assigneeUserId: actor.id }, { assigneeUserId: null }] }
        : { id: "00000000-0000-0000-0000-000000000000" };

    const rows = await this.db.whatsAppConversation.findMany({
      where,
      include: { contact: true },
      orderBy: { lastMessageAt: "desc" },
      take: limit + 1,
      ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map((c) => mapConversationRow(c, this.isServiceWindowOpen(c.lastInboundAt))),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    };
  }

  async getMessages(actor: AuthUser, conversationId: string, opts?: { cursor?: string; limit?: number }) {
    const conv = await this.db.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });
    if (!conv) throw new AppError(404, "CONVERSATION_NOT_FOUND");
    this.assertAccess(actor, conv);

    const limit = Math.min(opts?.limit ?? 50, 100);
    const messages = await this.db.whatsAppMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    const items = (hasMore ? messages.slice(0, limit) : messages).reverse().map(mapMessageRow);

    return {
      conversation: mapConversationRow(conv, this.isServiceWindowOpen(conv.lastInboundAt)),
      messages: items,
      nextCursor: hasMore ? messages[limit - 1]?.id ?? null : null,
    };
  }

  async markRead(actor: AuthUser, conversationId: string) {
    return getMessagingWriteBridge(this.db).runLegacyWrite({
      surface: "whatsapp_inbox",
      registryKey: "workspace_mark_read",
      actor,
      idempotencyKey: `wa-read:${conversationId}:${actor.id}`,
      legacy: () => this.markReadDirect(actor, conversationId),
    });
  }

  private async markReadDirect(actor: AuthUser, conversationId: string) {
    const conv = await this.db.whatsAppConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new AppError(404, "CONVERSATION_NOT_FOUND");
    this.assertAccess(actor, conv);

    await this.db.whatsAppConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });
    void getMessagingWriteBridge(this.db)
      .onConversationRead({ actor, conversationId })
      .catch(() => undefined);
    return { ok: true };
  }

  async sendMessage(
    actor: AuthUser,
    input: {
      to?: string;
      conversationId?: string;
      type: SendMessageInput["type"];
      text?: string;
      templateName?: string;
      templateLanguage?: string;
      replyToMessageId?: string;
      mediaId?: string;
      caption?: string;
      filename?: string;
    },
  ) {
    const { assertCanSendMessages, loadUserMessagingGate } = await import(
      "../phone-verification/phone-verification.policy.js"
    );
    assertCanSendMessages(await loadUserMessagingGate(this.db, actor.id));
    return getMessagingWriteBridge(this.db).runLegacyWrite({
      surface: "whatsapp_inbox",
      registryKey: "whatsapp_outbound_text",
      actor,
      idempotencyKey: `wa-send:${input.conversationId ?? input.to ?? "new"}:${Date.now()}`,
      legacy: () => this.sendMessageDirect(actor, input),
    });
  }

  private async sendMessageDirect(
    actor: AuthUser,
    input: {
      to?: string;
      conversationId?: string;
      type: SendMessageInput["type"];
      text?: string;
      templateName?: string;
      templateLanguage?: string;
      replyToMessageId?: string;
      mediaId?: string;
      caption?: string;
      filename?: string;
    },
  ) {
    this.assertAccess(actor);

    if (input.type !== "text" && input.type !== "template") {
      registerWiredSurface("whatsapp_outbound_media");
    }

    let conversation = input.conversationId
      ? await this.db.whatsAppConversation.findUnique({
          where: { id: input.conversationId },
          include: { contact: true },
        })
      : null;

    if (input.conversationId && !conversation) throw new AppError(404, "CONVERSATION_NOT_FOUND");
    if (conversation) this.assertAccess(actor, conversation);

    const toPhone = conversation?.contact.phoneNumber ?? input.to;
    if (!toPhone || !validateE164Phone(toPhone)) {
      throw new AppError(400, "INVALID_PHONE", { message: "Valid E.164 phone number required" });
    }

    if (input.type === "text" && conversation && !this.isServiceWindowOpen(conversation.lastInboundAt)) {
      throw new AppError(400, "CUSTOMER_SERVICE_WINDOW_CLOSED", {
        message:
          "24-hour customer service window is closed. Use a pre-approved template message to contact this user.",
      });
    }

    let replyToMetaId: string | undefined;
    if (input.replyToMessageId) {
      const replyMsg = await this.db.whatsAppMessage.findUnique({
        where: { id: input.replyToMessageId },
        select: { metaMessageId: true, conversationId: true },
      });
      if (!replyMsg?.metaMessageId) throw new AppError(400, "INVALID_REPLY_TARGET");
      if (conversation && replyMsg.conversationId !== conversation.id) {
        throw new AppError(400, "INVALID_REPLY_TARGET");
      }
      replyToMetaId = replyMsg.metaMessageId;
    }

    if (!conversation) {
      const normalized = normalizePhone(toPhone)!;
      let contact = await this.db.whatsAppContact.findUnique({ where: { waId: normalized } });
      if (!contact) {
        contact = await this.db.whatsAppContact.create({
          data: { waId: normalized, phoneNumber: normalized },
        });
      }
      conversation = await this.db.whatsAppConversation.findUnique({
        where: { contactId_phoneNumberId: { contactId: contact.id, phoneNumberId: "default" } },
        include: { contact: true },
      }) ?? await this.db.whatsAppConversation.create({
        data: { contactId: contact.id, phoneNumberId: "default" },
        include: { contact: true },
      });
    }

    const msgType = input.type === "template" ? "template" : input.type;
    const bodyPreview = input.text ?? input.caption ?? (input.type === "template" ? `[Template: ${input.templateName}]` : null);

    const pending = await this.db.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        type: msgType,
        body: bodyPreview,
        caption: input.caption ?? null,
        filename: input.filename ?? null,
        mediaId: input.mediaId ?? null,
        replyToMessageId: input.replyToMessageId ?? null,
        replyToMetaId: replyToMetaId ?? null,
        status: "queued",
        authorUserId: actor.id,
      },
    });

    const sendInput: SendMessageInput = {
      to: conversation.contact.phoneNumber,
      type: input.type,
      text: input.text,
      templateName: input.templateName,
      templateLanguage: input.templateLanguage,
      mediaId: input.mediaId,
      caption: input.caption,
      filename: input.filename,
      replyToMetaId,
    };

    const result = await sendWhatsAppMessage(sendInput);
    const now = new Date();
    const updated = await this.db.whatsAppMessage.update({
      where: { id: pending.id },
      data: {
        metaMessageId: result.metaMessageId,
        status: result.metaMessageId ? "sent" : "failed",
        sentAt: result.metaMessageId ? now : null,
        failedAt: result.metaMessageId ? null : now,
        errorCode: result.errorCode ?? null,
        errorMessage: result.error ?? null,
      },
    });

    const preview = previewForMessage(msgType, bodyPreview, input.caption ?? null);
    const convUpdated = await this.db.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        lastMessagePreview: preview,
      },
      include: { contact: true },
    });

    const messageDto = mapMessageRow(updated);
    const convDto = mapConversationRow(
      convUpdated,
      this.isServiceWindowOpen(convUpdated.lastInboundAt),
    );

    this.emitConversationEvent(conversation.id, "whatsapp:message:new", {
      conversationId: conversation.id,
      message: messageDto,
      conversation: convDto,
    });

    void getMessagingWriteBridge(this.db)
      .onWhatsAppMessageCreated({
        actor,
        whatsappConversationId: conversation.id,
        messageId: updated.id,
        direction: "OUTBOUND",
        metaMessageId: result.metaMessageId,
      })
      .catch(() => undefined);

    if (!result.metaMessageId && result.error) {
      throw new AppError(502, "WHATSAPP_SEND_FAILED", { message: result.error, messageId: pending.id });
    }

    return messageDto;
  }

  async getMedia(actor: AuthUser, messageId: string) {
    const msg = await this.db.whatsAppMessage.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!msg?.mediaStorageKey) throw new AppError(404, "MEDIA_NOT_FOUND");
    this.assertAccess(actor, msg.conversation);
    return {
      storageKey: msg.mediaStorageKey,
      mimeType: msg.mimeType ?? "application/octet-stream",
      filename: msg.filename ?? "media",
    };
  }
}
