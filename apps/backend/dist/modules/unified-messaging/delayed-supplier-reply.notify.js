import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
import { sendWhatsAppMessage } from "../whatsapp-inbox/whatsapp-inbox.send.js";
export const DELAYED_SUPPLIER_REPLY_MS = 60 * 60 * 1000; // 1 hour
export const DELAYED_SUPPLIER_REPLY_BODY = "Your supplier has replied to your message. Open your DeMaxtore Workspace to view the latest response.";
/**
 * If a supplier WhatsApp/inbound reply arrives more than 1 hour after the buyer's
 * last outbound message in the same conversation, notify the buyer on WhatsApp.
 */
export async function maybeNotifyBuyerOfDelayedSupplierReply(prisma, conversationId, inboundMessageId, inboundCreatedAt = new Date()) {
    try {
        const lastBuyerOutbound = await prisma.workspaceMessage.findFirst({
            where: {
                conversationId,
                direction: "OUTBOUND",
                audienceScope: "EXTERNAL",
                createdAt: { lt: inboundCreatedAt },
                id: { not: inboundMessageId },
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, createdAt: true },
        });
        if (!lastBuyerOutbound)
            return;
        const lagMs = inboundCreatedAt.getTime() - lastBuyerOutbound.createdAt.getTime();
        if (lagMs < DELAYED_SUPPLIER_REPLY_MS)
            return;
        // Any supplier inbound already between buyer message and this reply? Then this isn't the first late reply.
        const interveningInbound = await prisma.workspaceMessage.findFirst({
            where: {
                conversationId,
                direction: "INBOUND",
                audienceScope: "EXTERNAL",
                createdAt: { gt: lastBuyerOutbound.createdAt, lt: inboundCreatedAt },
                id: { not: inboundMessageId },
            },
            select: { id: true },
        });
        if (interveningInbound)
            return;
        const conv = await prisma.workspaceConversation.findUnique({
            where: { id: conversationId },
            select: { id: true, metadata: true, workspaceId: true, workspaceType: true },
        });
        if (!conv)
            return;
        const meta = typeof conv.metadata === "object" && conv.metadata && !Array.isArray(conv.metadata)
            ? { ...conv.metadata }
            : {};
        const notifiedFor = Array.isArray(meta.delayedReplyNotifiedFor)
            ? meta.delayedReplyNotifiedFor.filter((x) => typeof x === "string")
            : [];
        if (notifiedFor.includes(lastBuyerOutbound.id))
            return;
        const buyerUserId = (typeof meta.rfqBuyerUserId === "string" && meta.rfqBuyerUserId) ||
            (await prisma.workspaceConversationParticipant.findFirst({
                where: { conversationId, participantRole: "OWNER", leftAt: null, userId: { not: null } },
                select: { userId: true },
            }))?.userId;
        if (!buyerUserId)
            return;
        const buyer = await prisma.user.findUnique({
            where: { id: buyerUserId },
            select: { id: true, whatsappPhone: true },
        });
        const phone = normalizePhone(buyer?.whatsappPhone);
        if (!phone) {
            logger.info({ conversationId, buyerUserId }, "[delayed-reply] skip — buyer has no WhatsApp phone");
            return;
        }
        if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
            logger.warn({ conversationId }, "[delayed-reply] skip — platform WhatsApp not configured");
            return;
        }
        const result = await sendWhatsAppMessage({
            to: phone,
            type: "text",
            text: DELAYED_SUPPLIER_REPLY_BODY,
            credentials: {
                accessToken: env.WHATSAPP_ACCESS_TOKEN,
                phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
                buyerId: "platform",
            },
        });
        if (result.error && !result.demo) {
            logger.warn({ conversationId, error: result.error, errorCode: result.errorCode }, "[delayed-reply] WhatsApp send failed");
            return;
        }
        notifiedFor.push(lastBuyerOutbound.id);
        await prisma.workspaceConversation.update({
            where: { id: conversationId },
            data: {
                metadata: {
                    ...meta,
                    delayedReplyNotifiedFor: notifiedFor.slice(-20),
                },
            },
        });
        logger.info({
            conversationId,
            buyerUserId,
            buyerOutboundId: lastBuyerOutbound.id,
            lagMinutes: Math.round(lagMs / 60_000),
            demo: result.demo,
        }, "[delayed-reply] buyer notified on WhatsApp");
    }
    catch (err) {
        logger.warn({ err, conversationId }, "[delayed-reply] notify failed");
    }
}
//# sourceMappingURL=delayed-supplier-reply.notify.js.map