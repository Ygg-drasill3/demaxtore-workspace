import { AppError } from "../../utils/httpErrors.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { getMessagingWriteBridge } from "../unified-messaging/messaging-write.bridge.js";
import { registerWiredSurface } from "../unified-messaging/messaging-write.registry.js";
import { parseInboundMessages, parseStatusUpdates } from "./whatsapp-inbox.parser.js";
import { downloadWhatsAppMedia } from "./whatsapp-inbox.media.js";
import { sendWhatsAppMessage, validateE164Phone } from "./whatsapp-inbox.send.js";
import { getWhatsAppBusinessPhoneNumberId } from "./whatsapp-conversation.util.js";
import { CUSTOMER_SERVICE_WINDOW_MS, canAccessAllWhatsAppConversations, } from "./whatsapp-inbox.types.js";
import { resolveInboundWorkspaceConversation, recordUnresolvedWebhook, } from "../whatsapp-business/whatsapp-conversation-resolver.service.js";
import { logWhatsAppConnectionAudit } from "../whatsapp-business/whatsapp-business-audit.service.js";
function previewForMessage(type, body, caption) {
    if (body?.trim())
        return body.trim().slice(0, 200);
    if (caption?.trim())
        return caption.trim().slice(0, 200);
    const labels = {
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
function mapMessageRow(m) {
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
function mapConversationRow(conv, serviceWindowOpen) {
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
    db;
    constructor(db) {
        this.db = db;
    }
    assertAccess(actor, conv) {
        if (!canAccessAllWhatsAppConversations(actor.role)) {
            if (actor.role !== "SALES_CONTROL")
                throw new AppError(403, "FORBIDDEN");
            if (conv && conv.assigneeUserId && conv.assigneeUserId !== actor.id) {
                throw new AppError(403, "FORBIDDEN", { message: "Not assigned to this conversation" });
            }
        }
    }
    isServiceWindowOpen(lastInboundAt) {
        if (!lastInboundAt)
            return false;
        return Date.now() - lastInboundAt.getTime() < CUSTOMER_SERVICE_WINDOW_MS;
    }
    emitConversationEvent(conversationId, event, payload) {
        socketBus.scheduleEmit(() => {
            socketBus.emitToRole("ADMIN", event, payload);
            socketBus.emitToRole("SUPER_ADMIN", event, payload);
            socketBus.emitToRole("OPS_MANAGER", event, payload);
            socketBus.emitToRole("SALES_CONTROL", event, payload);
            socketBus.emitToRoom(`whatsapp:conversation:${conversationId}`, event, payload);
        });
    }
    async processWebhookPayload(body) {
        const inboundItems = parseInboundMessages(body);
        const statusItems = parseStatusUpdates(body);
        let inbound = 0;
        let statuses = 0;
        for (const item of inboundItems) {
            const result = await this.ingestInbound(item);
            if (result && !result.duplicate)
                inbound += 1;
        }
        for (const st of statusItems) {
            const updated = await this.applyStatusUpdate(st);
            if (updated)
                statuses += 1;
        }
        return { inbound, statuses };
    }
    async ingestInbound(item) {
        if (item.metaMessageId) {
            const dup = await this.db.whatsAppMessage.findUnique({
                where: { metaMessageId: item.metaMessageId },
                select: { id: true, conversationId: true },
            });
            if (dup)
                return { messageId: dup.id, conversationId: dup.conversationId, duplicate: true };
        }
        const normalized = normalizePhone(item.waId);
        if (!normalized)
            return null;
        let contact = await this.db.whatsAppContact.findUnique({ where: { waId: normalized } });
        if (!contact) {
            contact = await this.db.whatsAppContact.create({
                data: {
                    waId: normalized,
                    phoneNumber: normalized,
                    profileName: item.profileName,
                },
            });
        }
        else if (item.profileName && item.profileName !== contact.profileName) {
            contact = await this.db.whatsAppContact.update({
                where: { id: contact.id },
                data: { profileName: item.profileName },
            });
        }
        const phoneNumberId = item.phoneNumberId ?? "default";
        const tenantConnection = item.phoneNumberId
            ? await this.db.whatsAppBusinessConnection.findUnique({
                where: { phoneNumberId: item.phoneNumberId },
                select: { buyerId: true, status: true, id: true },
            })
            : null;
        if (tenantConnection?.status === "DISCONNECTED") {
            await logWhatsAppConnectionAudit(this.db, {
                buyerId: tenantConnection.buyerId,
                connectionId: tenantConnection.id,
                action: "WHATSAPP_INBOUND_DISCONNECTED",
                detail: { metaMessageId: item.metaMessageId, from: item.waId },
            });
            await recordUnresolvedWebhook(this.db, {
                phoneNumberId,
                buyerId: tenantConnection.buyerId,
                supplierWaId: item.waId,
                metaMessageId: item.metaMessageId,
                reason: "CONNECTION_DISCONNECTED",
                payload: { type: item.type },
            });
            return null;
        }
        let conversation = await this.db.whatsAppConversation.findUnique({
            where: { contactId_phoneNumberId: { contactId: contact.id, phoneNumberId } },
            include: { contact: true },
        });
        if (!conversation) {
            conversation = await this.db.whatsAppConversation.create({
                data: {
                    contactId: contact.id,
                    phoneNumberId,
                    userId: tenantConnection?.buyerId ?? null,
                    lastInboundAt: item.timestamp,
                    lastMessageAt: item.timestamp,
                    lastMessagePreview: previewForMessage(item.type, item.body, item.caption),
                    unreadCount: 1,
                },
                include: { contact: true },
            });
        }
        else if (tenantConnection?.buyerId && !conversation.userId) {
            conversation = await this.db.whatsAppConversation.update({
                where: { id: conversation.id },
                data: { userId: tenantConnection.buyerId },
                include: { contact: true },
            });
        }
        else if (!conversation.workspaceRfqId) {
            if (tenantConnection?.buyerId) {
                const earlyResolution = await resolveInboundWorkspaceConversation(this.db, {
                    phoneNumberId,
                    buyerId: tenantConnection.buyerId,
                    supplierWaId: item.waId,
                    replyToMetaId: item.replyToMetaId,
                    whatsappConversationId: conversation.id,
                });
                if (earlyResolution.kind === "resolved") {
                    const wsConv = await this.db.workspaceConversation.findUnique({
                        where: { id: earlyResolution.workspaceConversationId },
                        select: { workspaceId: true, workspaceType: true },
                    });
                    if (wsConv?.workspaceType === "RFQ") {
                        conversation = await this.db.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: { workspaceRfqId: wsConv.workspaceId },
                            include: { contact: true },
                        });
                    }
                }
            }
            else if (!tenantConnection) {
                const supplierUserId = contact.userId;
                if (supplierUserId) {
                    const rfqPart = await this.db.workspaceParticipant.findFirst({
                        where: {
                            userId: supplierUserId,
                            participantRole: "COUNTERPARTY",
                            leftAt: null,
                            workspace: { type: "RFQ" },
                        },
                        orderBy: { joinedAt: "desc" },
                        select: {
                            workspaceId: true,
                            workspace: {
                                select: {
                                    participants: {
                                        where: { participantRole: "OWNER", leftAt: null },
                                        take: 1,
                                        select: { userId: true },
                                    },
                                },
                            },
                        },
                    });
                    if (rfqPart) {
                        const buyerUserId = rfqPart.workspace.participants[0]?.userId ?? null;
                        conversation = await this.db.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                workspaceRfqId: rfqPart.workspaceId,
                                ...(buyerUserId && !conversation.userId ? { userId: buyerUserId } : {}),
                            },
                            include: { contact: true },
                        });
                    }
                }
            }
        }
        let replyToMessageId = null;
        if (item.replyToMetaId) {
            const parent = await this.db.whatsAppMessage.findUnique({
                where: { metaMessageId: item.replyToMetaId },
                select: { id: true },
            });
            replyToMessageId = parent?.id ?? null;
        }
        let mediaStorageKey = null;
        let mimeType = item.mimeType;
        let filename = item.filename;
        if (item.mediaId) {
            const downloaded = await downloadWhatsAppMedia(this.db, item.mediaId, {
                filename: item.filename,
                mimeType: item.mimeType,
                phoneNumberId: item.phoneNumberId,
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
        let resolvedWorkspaceConversationId;
        if (tenantConnection?.buyerId) {
            const resolution = await resolveInboundWorkspaceConversation(this.db, {
                phoneNumberId,
                buyerId: tenantConnection.buyerId,
                supplierWaId: item.waId,
                replyToMetaId: item.replyToMetaId,
                whatsappConversationId: conversation.id,
            });
            if (resolution.kind === "unresolved" || resolution.kind === "ambiguous") {
                await recordUnresolvedWebhook(this.db, {
                    phoneNumberId,
                    buyerId: tenantConnection.buyerId,
                    supplierWaId: item.waId,
                    metaMessageId: item.metaMessageId,
                    reason: resolution.kind === "ambiguous" ? "AMBIGUOUS_CONVERSATION" : resolution.reason,
                    payload: {
                        candidates: resolution.kind === "ambiguous" ? resolution.candidates : undefined,
                    },
                });
                await logWhatsAppConnectionAudit(this.db, {
                    buyerId: tenantConnection.buyerId,
                    connectionId: tenantConnection.id,
                    action: "WHATSAPP_INBOUND_UNRESOLVED",
                    detail: { reason: resolution.kind, metaMessageId: item.metaMessageId },
                });
            }
            else if (resolution.kind === "resolved") {
                resolvedWorkspaceConversationId = resolution.workspaceConversationId;
                const wsConv = await this.db.workspaceConversation.findUnique({
                    where: { id: resolution.workspaceConversationId },
                    select: { id: true, metadata: true, workspaceId: true, workspaceType: true },
                });
                if (wsConv) {
                    const meta = wsConv.metadata ?? {};
                    await this.db.workspaceConversation.update({
                        where: { id: wsConv.id },
                        data: {
                            metadata: {
                                ...meta,
                                whatsappConversationId: conversation.id,
                                buyerId: tenantConnection.buyerId,
                                buyerWhatsAppPhoneNumberId: phoneNumberId,
                            },
                        },
                    });
                    if (wsConv.workspaceType === "RFQ" && conversation.workspaceRfqId !== wsConv.workspaceId) {
                        await this.db.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: { workspaceRfqId: wsConv.workspaceId },
                        });
                    }
                }
            }
        }
        await getMessagingWriteBridge(this.db)
            .onWhatsAppInbound({
            whatsappConversationId: conversation.id,
            messageId: msg.id,
            metaMessageId: item.metaMessageId,
            body: item.body ?? "",
            duplicate: false,
            workspaceConversationId: resolvedWorkspaceConversationId,
        })
            .catch(() => undefined);
        return { messageId: msg.id, conversationId: conversation.id, duplicate: false };
    }
    async applyStatusUpdate(st) {
        const msg = await this.db.whatsAppMessage.findUnique({
            where: { metaMessageId: st.metaMessageId },
        });
        if (!msg || msg.direction !== "OUTBOUND")
            return false;
        const update = { status: st.status };
        if (st.status === "sent")
            update.sentAt = st.timestamp;
        if (st.status === "delivered")
            update.deliveredAt = st.timestamp;
        if (st.status === "read")
            update.readAt = st.timestamp;
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
                raw: st.raw,
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
    async listConversations(actor, opts) {
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
    async getMessages(actor, conversationId, opts) {
        const conv = await this.db.whatsAppConversation.findUnique({
            where: { id: conversationId },
            include: { contact: true },
        });
        if (!conv)
            throw new AppError(404, "CONVERSATION_NOT_FOUND");
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
    async markRead(actor, conversationId) {
        return getMessagingWriteBridge(this.db).runLegacyWrite({
            surface: "whatsapp_inbox",
            registryKey: "workspace_mark_read",
            actor,
            idempotencyKey: `wa-read:${conversationId}:${actor.id}`,
            legacy: () => this.markReadDirect(actor, conversationId),
        });
    }
    async markReadDirect(actor, conversationId) {
        const conv = await this.db.whatsAppConversation.findUnique({ where: { id: conversationId } });
        if (!conv)
            throw new AppError(404, "CONVERSATION_NOT_FOUND");
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
    async sendMessage(actor, input) {
        const { assertCanSendMessages, loadUserMessagingGate } = await import("../phone-verification/phone-verification.policy.js");
        assertCanSendMessages(await loadUserMessagingGate(this.db, actor.id));
        return getMessagingWriteBridge(this.db).runLegacyWrite({
            surface: "whatsapp_inbox",
            registryKey: "whatsapp_outbound_text",
            actor,
            idempotencyKey: `wa-send:${input.conversationId ?? input.to ?? "new"}:${Date.now()}`,
            legacy: () => this.sendMessageDirect(actor, input),
        });
    }
    async sendMessageDirect(actor, input) {
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
        if (input.conversationId && !conversation)
            throw new AppError(404, "CONVERSATION_NOT_FOUND");
        if (conversation)
            this.assertAccess(actor, conversation);
        const toPhone = conversation?.contact.phoneNumber ?? input.to;
        if (!toPhone || !validateE164Phone(toPhone)) {
            throw new AppError(400, "INVALID_PHONE", { message: "Valid E.164 phone number required" });
        }
        if (input.type === "text" && conversation && !this.isServiceWindowOpen(conversation.lastInboundAt)) {
            throw new AppError(400, "CUSTOMER_SERVICE_WINDOW_CLOSED", {
                message: "24-hour customer service window is closed. Use a pre-approved template message to contact this user.",
            });
        }
        let replyToMetaId;
        if (input.replyToMessageId) {
            const replyMsg = await this.db.whatsAppMessage.findUnique({
                where: { id: input.replyToMessageId },
                select: { metaMessageId: true, conversationId: true },
            });
            if (!replyMsg?.metaMessageId)
                throw new AppError(400, "INVALID_REPLY_TARGET");
            if (conversation && replyMsg.conversationId !== conversation.id) {
                throw new AppError(400, "INVALID_REPLY_TARGET");
            }
            replyToMetaId = replyMsg.metaMessageId;
        }
        if (!conversation) {
            const normalized = normalizePhone(toPhone);
            let contact = await this.db.whatsAppContact.findUnique({ where: { waId: normalized } });
            if (!contact) {
                contact = await this.db.whatsAppContact.create({
                    data: { waId: normalized, phoneNumber: normalized },
                });
            }
            conversation = await this.db.whatsAppConversation.findUnique({
                where: {
                    contactId_phoneNumberId: {
                        contactId: contact.id,
                        phoneNumberId: getWhatsAppBusinessPhoneNumberId(),
                    },
                },
                include: { contact: true },
            }) ?? await this.db.whatsAppConversation.create({
                data: {
                    contactId: contact.id,
                    phoneNumberId: getWhatsAppBusinessPhoneNumberId(),
                },
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
        const sendInput = {
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
        const convDto = mapConversationRow(convUpdated, this.isServiceWindowOpen(convUpdated.lastInboundAt));
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
    async getMedia(actor, messageId) {
        const msg = await this.db.whatsAppMessage.findUnique({
            where: { id: messageId },
            include: { conversation: true },
        });
        if (!msg?.mediaStorageKey)
            throw new AppError(404, "MEDIA_NOT_FOUND");
        this.assertAccess(actor, msg.conversation);
        return {
            storageKey: msg.mediaStorageKey,
            mimeType: msg.mimeType ?? "application/octet-stream",
            filename: msg.filename ?? "media",
        };
    }
}
//# sourceMappingURL=whatsapp-inbox.service.js.map