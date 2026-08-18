import { getUnifiedMessagingWriteMode } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { mapWhatsAppStatusToCanonical } from "./messaging-status.js";
/** Mirrors WhatsApp webhook payloads into unified workspace_messages when write mode allows. */
export class UnifiedMessagingInboundHandler {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveUnifiedConversation(whatsappConversationId) {
        const linked = await this.prisma.workspaceConversation.findFirst({
            where: { metadata: { path: ["whatsappConversationId"], equals: whatsappConversationId } },
        });
        if (linked)
            return linked;
        const waConv = await this.prisma.whatsAppConversation.findUnique({
            where: { id: whatsappConversationId },
            select: { workspaceRfqId: true, contact: { select: { waId: true, userId: true } } },
        });
        if (!waConv)
            return null;
        if (waConv.workspaceRfqId) {
            const rfqConv = await this.prisma.workspaceConversation.findUnique({
                where: {
                    workspaceType_workspaceId: { workspaceType: "RFQ", workspaceId: waConv.workspaceRfqId },
                },
            });
            if (rfqConv) {
                await this.linkWhatsAppConversation(rfqConv, whatsappConversationId);
                return rfqConv;
            }
        }
        const supplierWa = waConv.contact?.waId;
        if (supplierWa) {
            const matches = await this.prisma.workspaceConversation.findMany({
                where: {
                    primaryChannel: "WHATSAPP",
                    metadata: { path: ["rfqSupplierWhatsAppPhone"], equals: supplierWa },
                    contexts: { some: { contextType: "RFQ" } },
                },
                orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
                take: 10,
            });
            if (matches.length === 1) {
                await this.linkWhatsAppConversation(matches[0], whatsappConversationId);
                return matches[0];
            }
            if (matches.length > 1) {
                const alreadyLinked = matches.find((m) => {
                    const meta = typeof m.metadata === "object" && m.metadata && !Array.isArray(m.metadata)
                        ? m.metadata
                        : {};
                    return meta.whatsappConversationId === whatsappConversationId;
                });
                if (alreadyLinked) {
                    return alreadyLinked;
                }
                // Same supplier phone on multiple RFQs — do not guess; reply/context resolution must decide.
                logger.warn({ supplierWa, candidateCount: matches.length, whatsappConversationId }, "ambiguous RFQ WhatsApp inbound — refusing phone-only match");
            }
        }
        return null;
    }
    async linkWhatsAppConversation(rfqConv, whatsappConversationId) {
        const metadata = typeof rfqConv.metadata === "object" && rfqConv.metadata && !Array.isArray(rfqConv.metadata)
            ? rfqConv.metadata
            : {};
        if (metadata.whatsappConversationId === whatsappConversationId)
            return;
        await this.prisma.workspaceConversation.update({
            where: { id: rfqConv.id },
            data: {
                metadata: { ...metadata, whatsappConversationId },
            },
        });
    }
    async mirrorWhatsAppInboxResult(inboxResult) {
        const mode = getUnifiedMessagingWriteMode();
        if (mode === "legacy_only")
            return null;
        if (!inboxResult.conversationId || !inboxResult.messageId)
            return null;
        try {
            const unifiedConv = inboxResult.workspaceConversationId
                ? await this.prisma.workspaceConversation.findUnique({
                    where: { id: inboxResult.workspaceConversationId },
                })
                : await this.resolveUnifiedConversation(inboxResult.conversationId);
            if (!unifiedConv) {
                logger.debug({ whatsappConversationId: inboxResult.conversationId }, "unified whatsapp inbound mirror — no RFQ conversation link");
                return null;
            }
            const legacyId = inboxResult.messageId;
            const existing = await this.prisma.workspaceMessage.findFirst({
                where: { legacySource: "whatsapp", legacyId },
            });
            if (existing)
                return existing;
            if (inboxResult.metaMessageId) {
                const dup = await this.prisma.workspaceMessage.findFirst({
                    where: { externalMessageId: inboxResult.metaMessageId },
                });
                if (dup)
                    return dup;
            }
            const waConv = await this.prisma.whatsAppConversation.findUnique({
                where: { id: inboxResult.conversationId },
                select: { contact: { select: { userId: true } } },
            });
            const authorUserId = waConv?.contact?.userId ?? null;
            const isInbound = inboxResult.direction !== "OUTBOUND";
            const row = await this.prisma.workspaceMessage.create({
                data: {
                    conversationId: unifiedConv.id,
                    authorUserId: isInbound ? authorUserId : null,
                    messageType: "MESSAGE",
                    visibility: "ALL_PARTICIPANTS",
                    audienceScope: "EXTERNAL",
                    direction: isInbound ? "INBOUND" : "OUTBOUND",
                    channelSource: "WHATSAPP",
                    body: inboxResult.body ?? "",
                    legacySource: "whatsapp",
                    legacyId,
                    externalMessageId: inboxResult.metaMessageId ?? undefined,
                    whatsappMessageId: inboxResult.metaMessageId ?? undefined,
                    sentAt: new Date(),
                },
            });
            return row;
        }
        catch (err) {
            logger.warn({ err: String(err) }, "unified whatsapp inbound mirror failed");
            return null;
        }
    }
    async mirrorDeliveryStatus(metaMessageId, status, raw) {
        const mode = getUnifiedMessagingWriteMode();
        if (mode === "legacy_only")
            return;
        const msg = await this.prisma.workspaceMessage.findFirst({
            where: {
                OR: [{ externalMessageId: metaMessageId }, { whatsappMessageId: metaMessageId }],
            },
        });
        if (!msg)
            return;
        const canonical = mapWhatsAppStatusToCanonical(status);
        const now = new Date();
        const data = {};
        if (canonical === "SENT")
            data.sentAt = now;
        if (canonical === "DELIVERED")
            data.deliveredAt = now;
        if (canonical === "READ")
            data.readAt = now;
        if (canonical === "FAILED") {
            data.failedAt = now;
            const errors = raw?.errors;
            const err = errors?.[0];
            if (err) {
                data.failureReason = err.message ?? err.title ?? (err.code != null ? String(err.code) : "delivery_failed");
            }
        }
        if (Object.keys(data).length === 0)
            return;
        await this.prisma.workspaceMessage.update({ where: { id: msg.id }, data });
        const { getMessagingWriteBridge } = await import("./messaging-write.bridge.js");
        getMessagingWriteBridge(this.prisma).publishEvent("messaging:message:status", {
            conversationId: msg.conversationId,
            messageId: msg.id,
            idempotencyKey: `${msg.id}:${status}`,
        });
    }
}
//# sourceMappingURL=unified-messaging-inbound.handler.js.map