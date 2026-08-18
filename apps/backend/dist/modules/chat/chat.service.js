import { AppError } from "../../utils/httpErrors.js";
import { sendTextMessage, normalizePhone } from "./whatsapp.service.js";
import { canAccessCommWorkspace } from "../workspace-communication/communication.policy.js";
import { ConversationLinkService } from "./conversation-link.service.js";
import { mapConversationRow, mapMessageRow, resolveSenderType } from "./chat.mapper.js";
import { isAdminChatRole } from "./chat.types.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { logger } from "../../config/logger.js";
import { getMessagingWriteBridge } from "../unified-messaging/messaging-write.bridge.js";
import { getMessagingWriteDispatcher } from "../unified-messaging/messaging-write.dispatcher.js";
export class TradeChatService {
    db;
    link;
    constructor(db) {
        this.db = db;
        this.link = new ConversationLinkService(db);
    }
    async assertRfqAccess(actor, rfqWorkspaceId) {
        if (!(await canAccessCommWorkspace(this.db, actor, "RFQ", rfqWorkspaceId))) {
            throw new AppError(403, "FORBIDDEN");
        }
    }
    async assertOrderAccess(actor, orderWorkspaceId) {
        if (!(await canAccessCommWorkspace(this.db, actor, "ORDER", orderWorkspaceId))) {
            throw new AppError(403, "FORBIDDEN");
        }
    }
    canAccessConv(conv, userId, role) {
        if (isAdminChatRole(role))
            return true;
        return conv.buyerUserId === userId || conv.peerUserId === userId;
    }
    emitMessageEvent(conv, message) {
        const payload = { conversationId: conv.id, message };
        socketBus.scheduleEmit(() => {
            socketBus.emitToWorkspace(conv.contextWorkspaceId, "chat:message:new", payload);
            socketBus.emitToUser(conv.buyerUserId, "chat:message:new", payload);
            if (conv.peerUserId)
                socketBus.emitToUser(conv.peerUserId, "chat:message:new", payload);
            socketBus.emitToRole("ADMIN", "chat:message:new", payload);
        });
    }
    async lastMessageMeta(conversationId) {
        const last = await this.db.directMessage.findFirst({
            where: { conversationId },
            orderBy: { createdAt: "desc" },
        });
        return {
            lastMessage: last?.body ?? null,
            lastAt: last?.createdAt?.toISOString() ?? null,
            lastSource: last?.source ?? last?.channel ?? null,
        };
    }
    async listConversations(userId, role) {
        const where = isAdminChatRole(role)
            ? {}
            : { OR: [{ buyerUserId: userId }, { peerUserId: userId }] };
        const rows = await this.db.directConversation.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            take: 200,
        });
        const out = [];
        for (const conv of rows) {
            const meta = await this.lastMessageMeta(conv.id);
            out.push(mapConversationRow(conv, meta));
        }
        return out;
    }
    async listAllForAdmin() {
        const rows = await this.db.directConversation.findMany({
            orderBy: { updatedAt: "desc" },
            take: 500,
        });
        const out = [];
        for (const conv of rows) {
            const meta = await this.lastMessageMeta(conv.id);
            out.push(mapConversationRow(conv, meta));
        }
        return out;
    }
    async listForWorkspace(contextType, contextWorkspaceId, actor) {
        if (contextType === "RFQ")
            await this.assertRfqAccess(actor, contextWorkspaceId);
        else
            await this.assertOrderAccess(actor, contextWorkspaceId);
        let rows = await this.db.directConversation.findMany({
            where: { contextType, contextWorkspaceId },
            orderBy: { peerName: "asc" },
        });
        if (contextType === "RFQ" && actor.role === "SUPPLIER") {
            rows = rows.filter((c) => c.peerUserId === actor.id);
        }
        const out = [];
        for (const conv of rows) {
            const meta = await this.lastMessageMeta(conv.id);
            let peerName = conv.peerName;
            let peerPhone = conv.whatsappPhone ?? conv.peerPhone;
            if (contextType === "RFQ" && actor.role === "SUPPLIER" && conv.peerUserId === actor.id) {
                const buyer = await this.db.user.findUnique({
                    where: { id: conv.buyerUserId },
                    select: { displayName: true, whatsappPhone: true },
                });
                peerName = buyer?.displayName ?? "Buyer";
                peerPhone = buyer?.whatsappPhone ?? null;
            }
            out.push({
                ...mapConversationRow(conv, { ...meta, peerName, peerPhone }),
                whatsappReady: Boolean(normalizePhone(peerPhone)),
            });
        }
        return out;
    }
    async listByRfqLink(opts) {
        const resolved = await this.link.resolveWorkspaceRfqId(opts);
        if (!resolved.workspaceRfqId && !resolved.freightIqRfqId) {
            throw new AppError(400, "RFQ_REFERENCE_REQUIRED", {
                message: "workspaceRfqId veya freightIqRfqId gerekli",
            });
        }
        if (resolved.workspaceRfqId) {
            await this.assertRfqAccess(opts.actor, resolved.workspaceRfqId);
            return this.listForWorkspace("RFQ", resolved.workspaceRfqId, opts.actor);
        }
        const rows = await this.link.findByFreightIqRfqId(resolved.freightIqRfqId);
        if (!rows.length) {
            throw new AppError(404, "CONVERSATIONS_NOT_FOUND", {
                message: "Bu FreightIQ RFQ için henüz sohbet yok. RFQ workspace açıldığında otomatik oluşturulur.",
                freightIqRfqId: resolved.freightIqRfqId,
            });
        }
        if (!isAdminChatRole(opts.actor.role)) {
            const allowed = rows.filter((c) => c.buyerUserId === opts.actor.id || c.peerUserId === opts.actor.id);
            if (!allowed.length)
                throw new AppError(403, "FORBIDDEN");
            rows.splice(0, rows.length, ...allowed);
        }
        const out = [];
        for (const conv of rows) {
            const meta = await this.lastMessageMeta(conv.id);
            out.push(mapConversationRow(conv, meta));
        }
        return out;
    }
    async ensureRfqConversations(rfqWorkspaceId, actor, freightToken) {
        await this.assertRfqAccess(actor, rfqWorkspaceId);
        const ws = await this.db.workspace.findUnique({
            where: { id: rfqWorkspaceId },
            select: { externalRef: true, createdById: true },
        });
        if (!ws)
            throw new AppError(404, "WORKSPACE_NOT_FOUND");
        const freightIqRfqId = await this.link.syncFreightIqRfqId(rfqWorkspaceId, actor.id, freightToken, actor.role);
        const buyerId = ws.createdById;
        const assignments = await this.db.supplierAssignment.findMany({
            where: { workspaceId: rfqWorkspaceId, removedAt: null },
        });
        const created = [];
        for (const a of assignments) {
            const peer = await this.db.user.findUnique({
                where: { id: a.supplierUserId },
                select: { id: true, displayName: true, whatsappPhone: true },
            });
            if (!peer)
                continue;
            const phone = peer.whatsappPhone;
            let conv = await this.db.directConversation.findUnique({
                where: {
                    contextType_contextWorkspaceId_peerKey: {
                        contextType: "RFQ",
                        contextWorkspaceId: rfqWorkspaceId,
                        peerKey: peer.id,
                    },
                },
            });
            const data = {
                contextRef: ws.externalRef,
                workspaceRfqId: rfqWorkspaceId,
                freightIqRfqId,
                peerName: peer.displayName,
                peerPhone: phone,
                whatsappPhone: phone,
                forwarderPhone: null,
                status: "active",
            };
            if (!conv) {
                conv = await this.db.directConversation.create({
                    data: {
                        contextType: "RFQ",
                        contextWorkspaceId: rfqWorkspaceId,
                        buyerUserId: buyerId,
                        peerKey: peer.id,
                        peerUserId: peer.id,
                        ...data,
                    },
                });
            }
            else {
                conv = await this.db.directConversation.update({
                    where: { id: conv.id },
                    data,
                });
            }
            created.push(conv);
        }
        return created.map((c) => mapConversationRow(c));
    }
    async enableRfqWhatsAppBridge(rfqWorkspaceId) {
        const { enableRfqWhatsApp } = await import("../rfq/rfq-whatsapp-enable.service.js");
        await enableRfqWhatsApp(this.db, rfqWorkspaceId);
    }
    async ensureOrderFreightConversation(orderWorkspaceId, forwarderContactId, actor) {
        await this.assertOrderAccess(actor, orderWorkspaceId);
        const ws = await this.db.workspace.findUnique({
            where: { id: orderWorkspaceId },
            include: {
                orderWorkspace: { select: { buyerUserId: true } },
                spawnedFrom: { select: { id: true } },
            },
        });
        if (!ws?.orderWorkspace)
            throw new AppError(404, "ORDER_NOT_FOUND");
        const forwarder = await this.db.forwarderContact.findUnique({
            where: { id: forwarderContactId },
        });
        if (!forwarder)
            throw new AppError(404, "FORWARDER_NOT_FOUND");
        const workspaceRfqId = ws.spawnedFrom?.id ?? null;
        let freightIqRfqId = null;
        if (workspaceRfqId) {
            freightIqRfqId = await this.link.findFreightIqRfqId(workspaceRfqId);
        }
        const phone = forwarder.phone;
        let conv = await this.db.directConversation.findUnique({
            where: {
                contextType_contextWorkspaceId_peerKey: {
                    contextType: "ORDER_FREIGHT",
                    contextWorkspaceId: orderWorkspaceId,
                    peerKey: forwarderContactId,
                },
            },
        });
        const data = {
            contextRef: ws.externalRef,
            workspaceRfqId,
            freightIqRfqId,
            peerName: forwarder.companyName,
            peerPhone: phone,
            whatsappPhone: phone,
            forwarderPhone: phone,
            status: "active",
        };
        if (!conv) {
            conv = await this.db.directConversation.create({
                data: {
                    contextType: "ORDER_FREIGHT",
                    contextWorkspaceId: orderWorkspaceId,
                    buyerUserId: ws.orderWorkspace.buyerUserId,
                    peerKey: forwarderContactId,
                    forwarderContactId,
                    ...data,
                },
            });
        }
        else {
            conv = await this.db.directConversation.update({
                where: { id: conv.id },
                data,
            });
        }
        return mapConversationRow(conv);
    }
    async syncOrderFreightFromCommunications(orderWorkspaceId, actor) {
        await this.assertOrderAccess(actor, orderWorkspaceId);
        const req = await this.db.freightRequest.findFirst({
            where: { orderId: orderWorkspaceId },
            include: { communications: { include: { forwarderContact: true } } },
        });
        if (!req)
            return [];
        const convs = [];
        for (const comm of req.communications) {
            if (!comm.forwarderContact)
                continue;
            convs.push(await this.ensureOrderFreightConversation(orderWorkspaceId, comm.forwarderContactId, actor));
        }
        return convs;
    }
    async getConversation(conversationId, userId, role) {
        const conv = await this.db.directConversation.findUnique({ where: { id: conversationId } });
        if (!conv || !this.canAccessConv(conv, userId, role)) {
            throw new AppError(404, "CONVERSATION_NOT_FOUND");
        }
        const messages = await this.db.directMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: "asc" },
            take: 300,
        });
        return {
            conversation: mapConversationRow(conv),
            messages: messages.map((m) => mapMessageRow(m, conv, userId, role)),
        };
    }
    async sendMessage(conversationId, actor, body) {
        const { assertCanSendMessages, loadUserMessagingGate } = await import("../phone-verification/phone-verification.policy.js");
        assertCanSendMessages(await loadUserMessagingGate(this.db, actor.id));
        const conv = await this.db.directConversation.findUnique({ where: { id: conversationId } });
        const registryKey = conv?.contextType === "ORDER_FREIGHT" ? "order_freight_chat_send" : "direct_chat_send";
        const { buildSocketOutbox } = await import("../unified-messaging/messaging-write.registry.js");
        return getMessagingWriteDispatcher(this.db).dispatchMutation({
            surface: "direct_chat",
            registryKey,
            actor,
            idempotencyKey: `chat:${conversationId}:${actor.id}:${Date.now()}`,
            unifiedPrimary: async (tx) => {
                const msg = await this.persistDirectMessageTx(tx, conversationId, actor, body);
                const c = await tx.directConversation.findUnique({ where: { id: conversationId } });
                if (!c)
                    throw new AppError(404, "CONVERSATION_NOT_FOUND");
                return mapMessageRow(msg, c, actor.id, actor.role);
            },
            buildOutbox: (result) => [
                buildSocketOutbox("direct_chat", {
                    event: "messaging:message:new",
                    conversationId,
                    messageId: result.id,
                    idempotencyKey: `chat:${result.id}`,
                }),
            ],
            legacyOnly: () => this.sendMessageDirect(conversationId, actor, body),
        });
    }
    async persistDirectMessageTx(tx, conversationId, actor, body) {
        const text = body.trim();
        if (!text)
            throw new AppError(400, "EMPTY_MESSAGE");
        const conv = await tx.directConversation.findUnique({ where: { id: conversationId } });
        if (!conv || !this.canAccessConv(conv, actor.id, actor.role)) {
            throw new AppError(404, "CONVERSATION_NOT_FOUND");
        }
        const senderType = resolveSenderType(actor.role, conv, actor.id);
        const msg = await tx.directMessage.create({
            data: {
                conversationId,
                authorUserId: actor.id,
                senderType,
                channel: "panel",
                source: "platform",
                body: text,
                deliveryStatus: "sent",
                status: "sent",
            },
        });
        await tx.directConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        return msg;
    }
    async sendMessageDirect(conversationId, actor, body) {
        const text = body.trim();
        if (!text)
            throw new AppError(400, "EMPTY_MESSAGE");
        const conv = await this.db.directConversation.findUnique({ where: { id: conversationId } });
        if (!conv || !this.canAccessConv(conv, actor.id, actor.role)) {
            throw new AppError(404, "CONVERSATION_NOT_FOUND");
        }
        const counterpartyPhone = conv.whatsappPhone ?? conv.peerPhone ?? conv.forwarderPhone;
        const targetPhone = actor.id === conv.buyerUserId || isAdminChatRole(actor.role)
            ? counterpartyPhone
            : conv.peerUserId
                ? (await this.db.user.findUnique({
                    where: { id: conv.buyerUserId },
                    select: { whatsappPhone: true },
                }))?.whatsappPhone
                : null;
        const senderType = resolveSenderType(actor.role, conv, actor.id);
        let source = "platform";
        let whatsappMessageId = null;
        let status = "queued";
        const normalized = normalizePhone(targetPhone);
        if (normalized) {
            const sender = await this.db.user.findUnique({
                where: { id: actor.id },
                select: { displayName: true, whatsappPhone: true },
            });
            const prefix = conv.contextType === "RFQ"
                ? `[${conv.contextRef ?? "RFQ"}] `
                : `[Navlun ${conv.contextRef ?? "Order"}] `;
            const wa = await sendTextMessage(normalized, `${prefix}${sender?.displayName ?? actor.email.split("@")[0] ?? "User"}: ${text}`);
            if (wa.id) {
                source = "whatsapp";
                whatsappMessageId = wa.id;
                status = wa.demo ? "sent" : "sent";
            }
            else if (wa.error) {
                status = "failed";
                logger.warn({ conversationId, error: wa.error }, "[Chat] WhatsApp send failed");
            }
            else {
                status = "sent";
            }
        }
        else {
            status = "sent";
        }
        const msg = await this.db.directMessage.create({
            data: {
                conversationId,
                authorUserId: actor.id,
                senderType,
                senderPhone: senderType === "admin" ? null : normalizePhone(targetPhone),
                channel: source === "whatsapp" ? "whatsapp" : "panel",
                source,
                body: text,
                whatsappMessageId,
                deliveryStatus: status,
                status,
            },
        });
        await this.db.directConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        const dto = mapMessageRow(msg, conv, actor.id, actor.role);
        this.emitMessageEvent(conv, dto);
        void getMessagingWriteBridge(this.db)
            .onDirectMessageCreated({
            actor,
            directConversationId: conversationId,
            messageId: msg.id,
            body: text,
            source,
            whatsappMessageId,
        })
            .catch(() => undefined);
        return dto;
    }
    async ingestInbound(fromPhone, messageText, whatsappMessageId) {
        if (whatsappMessageId) {
            const dup = await this.db.directMessage.findFirst({
                where: { whatsappMessageId },
                select: { id: true, conversationId: true },
            });
            if (dup) {
                logger.info({ whatsappMessageId }, "[Chat] duplicate WhatsApp message ignored");
                return { conversationId: dup.conversationId, messageId: dup.id, duplicate: true };
            }
        }
        const normalized = normalizePhone(fromPhone);
        if (!normalized)
            return null;
        const usersWithPhone = await this.db.user.findMany({
            where: { whatsappPhone: { not: null } },
            select: { id: true, whatsappPhone: true },
            take: 500,
        });
        const matchedUser = usersWithPhone.find((u) => normalizePhone(u.whatsappPhone) === normalized);
        const conversations = await this.db.directConversation.findMany({
            where: matchedUser
                ? {
                    OR: [
                        { peerUserId: matchedUser.id },
                        { buyerUserId: matchedUser.id },
                        { whatsappPhone: { not: null } },
                        { forwarderPhone: { not: null } },
                        { peerPhone: { not: null } },
                    ],
                }
                : {
                    OR: [
                        { whatsappPhone: { not: null } },
                        { forwarderPhone: { not: null } },
                        { peerPhone: { not: null } },
                    ],
                },
            orderBy: { updatedAt: "desc" },
            take: 100,
        });
        const phoneMatch = (c) => normalizePhone(c.whatsappPhone) === normalized ||
            normalizePhone(c.forwarderPhone) === normalized ||
            normalizePhone(c.peerPhone) === normalized;
        const matchedConv = conversations.find((c) => {
            if (phoneMatch(c))
                return true;
            if (matchedUser && c.peerUserId === matchedUser.id)
                return true;
            if (matchedUser && c.buyerUserId === matchedUser.id)
                return true;
            return false;
        });
        if (!matchedConv) {
            logger.warn({ from: normalized }, "[Chat] inbound WhatsApp — no conversation match");
            return null;
        }
        let authorId = null;
        let senderType = "supplier";
        if (matchedUser) {
            if (matchedConv.peerUserId === matchedUser.id) {
                authorId = matchedUser.id;
                senderType = "supplier";
            }
            else if (matchedConv.buyerUserId === matchedUser.id) {
                authorId = matchedUser.id;
                senderType = "buyer";
            }
        }
        else if (phoneMatch(matchedConv)) {
            authorId = matchedConv.peerUserId;
            senderType = matchedConv.forwarderContactId ? "forwarder" : "supplier";
        }
        const msg = await this.db.directMessage.create({
            data: {
                conversationId: matchedConv.id,
                authorUserId: authorId,
                senderType,
                senderPhone: normalized,
                channel: "whatsapp",
                source: "whatsapp",
                body: messageText,
                whatsappMessageId,
                deliveryStatus: "received",
                status: "received",
            },
        });
        await this.db.directConversation.update({
            where: { id: matchedConv.id },
            data: { updatedAt: new Date() },
        });
        const dto = mapMessageRow(msg, matchedConv, authorId ?? "", senderType);
        this.emitMessageEvent(matchedConv, dto);
        void getMessagingWriteBridge(this.db)
            .onDirectMessageCreated({
            actor: { id: authorId ?? "system", email: "", role: "SYSTEM" },
            directConversationId: matchedConv.id,
            messageId: msg.id,
            body: messageText,
            source: "whatsapp",
            whatsappMessageId,
        })
            .catch(() => undefined);
        return { conversationId: matchedConv.id, messageId: msg.id, duplicate: false };
    }
}
// Backward-compatible alias
export { TradeChatService as DirectChatService };
//# sourceMappingURL=chat.service.js.map