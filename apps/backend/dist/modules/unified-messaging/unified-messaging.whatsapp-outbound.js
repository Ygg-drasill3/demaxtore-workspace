import { env } from "../../config/env.js";
import { AppError } from "../../utils/httpErrors.js";
import { logger } from "../../config/logger.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
import { sendWhatsAppMessage } from "../whatsapp-inbox/whatsapp-inbox.send.js";
import { CUSTOMER_SERVICE_WINDOW_MS } from "../whatsapp-inbox/whatsapp-inbox.types.js";
import { resolveContactAndConversation, resolveLatestInboundAt, } from "../whatsapp-inbox/whatsapp-conversation.util.js";
import { WhatsAppBusinessConnectionService } from "../whatsapp-business/whatsapp-business-connection.service.js";
import { resolveBuyerWhatsAppTemplate } from "../whatsapp-business/whatsapp-template.service.js";
import { isBuyerConnectionWhatsAppMode } from "../../config/env.js";
export const DEMAXTORE_WHATSAPP_BUSINESS_DISPLAY = "+90 551 865 94 42";
export function isWhatsAppServiceWindowOpen(lastInboundAt) {
    if (!lastInboundAt)
        return false;
    return Date.now() - lastInboundAt.getTime() < CUSTOMER_SERVICE_WINDOW_MS;
}
function sanitizeForWhatsApp(text) {
    return text.replace(/[\r\n]+/g, " ").trim().slice(0, 900);
}
/** Wire format for supplier WhatsApp — sender display name + message (no RFQ ref prefix). */
export function formatWhatsAppOutboundBody(senderName, body) {
    const text = sanitizeForWhatsApp(body);
    const name = (senderName ?? "").trim();
    if (!name)
        return text;
    return `${name}: ${text}`;
}
function coldOutreachBlockedError(buyerDisplayPhone) {
    const line = buyerDisplayPhone ?? DEMAXTORE_WHATSAPP_BUSINESS_DISPLAY;
    const templateConfigured = Boolean(env.WHATSAPP_RFQ_TEMPLATE_NAME?.trim());
    const hint = templateConfigured
        ? "Meta şablonu yapılandırılmış ancak gönderim başarısız oldu."
        : `Tedarikçi önce sizin iş hattınıza (${line}) yazmalı veya Meta Business Manager'da onaylı bir WhatsApp şablonu eklenmeli.`;
    return new AppError(400, "WHATSAPP_COLD_OUTREACH_BLOCKED", {
        message: `WhatsApp 24 saat penceresi kapalı — ilk mesaj Meta tarafından reddedildi (131047). ${hint} Şimdilik Workspace kanalını kullanın.`,
        businessLine: line,
    });
}
function toSendCredentials(credentials) {
    return {
        accessToken: credentials.accessToken,
        phoneNumberId: credentials.phoneNumberId,
        buyerId: credentials.buyerId,
    };
}
async function sendApprovedTemplate(prisma, phone, rfqRef, messageBody, credentials, templateOverride) {
    const buyerTemplate = templateOverride ??
        (credentials.connectionId
            ? await resolveBuyerWhatsAppTemplate(prisma, credentials.connectionId)
            : null);
    const resolvedTemplate = buyerTemplate?.templateName ?? env.WHATSAPP_RFQ_TEMPLATE_NAME?.trim();
    const templateLanguage = buyerTemplate?.templateLanguage ?? env.WHATSAPP_RFQ_TEMPLATE_LANGUAGE ?? "en";
    if (!resolvedTemplate) {
        if (isBuyerConnectionWhatsAppMode()) {
            throw new AppError(400, "WHATSAPP_TEMPLATE_REQUIRED", {
                message: "An approved WhatsApp template is required for cold outreach. Configure a template on your connected WhatsApp Business Account.",
            });
        }
        throw coldOutreachBlockedError(credentials.displayPhoneNumber);
    }
    const ref = rfqRef ?? "DeMaxtore";
    const snippet = sanitizeForWhatsApp(messageBody);
    const result = await sendWhatsAppMessage({
        to: phone,
        type: "template",
        templateName: resolvedTemplate,
        templateLanguage,
        templateComponents: [
            {
                type: "body",
                parameters: [
                    { type: "text", text: ref },
                    { type: "text", text: snippet },
                ],
            },
        ],
        credentials: toSendCredentials(credentials),
    });
    if (!result.metaMessageId) {
        const connectionService = new WhatsAppBusinessConnectionService(prisma);
        await connectionService.handleMetaSendError(credentials.buyerId, result.errorCode, result.error);
        throw new AppError(502, "WHATSAPP_SEND_FAILED", {
            message: result.error ?? "WhatsApp template send failed",
            errorCode: result.errorCode,
        });
    }
    return {
        metaMessageId: result.metaMessageId,
        body: `[Template: ${resolvedTemplate}] ${ref}: ${snippet}`,
    };
}
function workspaceBaseUrl() {
    const origin = env.CORS_ORIGIN.split(",")[0]?.trim();
    return origin || "https://workspace.demaxtore.com";
}
/** Proactive RFQ outreach to supplier personal WhatsApp when 24h window is closed. */
async function sendRfqInteractiveSupplierOutreach(input, credentials) {
    const ref = input.rfqRef ?? "DeMaxtore";
    const preview = formatWhatsAppOutboundBody(input.senderName, input.body);
    const bodyText = [
        `*${ref} — Yeni mesaj*`,
        "",
        `"${sanitizeForWhatsApp(preview)}"`,
        "",
        "Yanıtlamak için bu WhatsApp hattına yazın veya aşağıdaki düğmeyi kullanın.",
    ].join("\n");
    const result = await sendWhatsAppMessage({
        to: input.phone,
        type: "interactive",
        interactiveBody: bodyText,
        interactiveButtonLabel: "Workspace",
        interactiveButtonUrl: `${workspaceBaseUrl()}/messages/${input.conversationId}`,
        credentials: toSendCredentials(credentials),
    });
    if (!result.metaMessageId) {
        throw new AppError(502, "WHATSAPP_SEND_FAILED", {
            message: result.error ?? "WhatsApp interactive outreach failed",
            errorCode: result.errorCode,
        });
    }
    return { metaMessageId: result.metaMessageId, body: bodyText };
}
/** Fail fast before persisting a workspace message that cannot be delivered on WhatsApp. */
export async function assertWhatsAppOutboundAllowed(prisma, phone, phoneNumberId, credentials) {
    const normalized = normalizePhone(phone);
    if (!normalized)
        throw new AppError(400, "INVALID_PHONE");
    const lastInboundAt = await resolveLatestInboundAt(prisma, phone, phoneNumberId);
    if (isWhatsAppServiceWindowOpen(lastInboundAt))
        return;
    const buyerTemplate = credentials?.connectionId
        ? await resolveBuyerWhatsAppTemplate(prisma, credentials.connectionId)
        : null;
    if (buyerTemplate?.templateName ?? env.WHATSAPP_RFQ_TEMPLATE_NAME?.trim())
        return;
    // Interactive RFQ outreach is attempted when the 24h window is closed.
}
/** Free text inside the 24h window; otherwise requires an approved Meta template. */
export async function sendWhatsAppOutbound(prisma, input) {
    const textBody = formatWhatsAppOutboundBody(input.senderName, input.body);
    const sendCreds = toSendCredentials(input.credentials);
    const connectionService = new WhatsAppBusinessConnectionService(prisma);
    const lastInboundAt = input.lastInboundAt ??
        (await resolveLatestInboundAt(prisma, input.phone, input.credentials.phoneNumberId));
    if (isWhatsAppServiceWindowOpen(lastInboundAt)) {
        const result = await sendWhatsAppMessage({
            to: input.phone,
            type: "text",
            text: textBody,
            credentials: sendCreds,
        });
        if (!result.metaMessageId) {
            await connectionService.handleMetaSendError(input.credentials.buyerId, result.errorCode, result.error);
            throw new AppError(502, "WHATSAPP_SEND_FAILED", {
                message: result.error ?? "WhatsApp send failed",
                errorCode: result.errorCode,
            });
        }
        return { metaMessageId: result.metaMessageId, mode: "text", body: textBody };
    }
    const buyerTemplate = input.credentials.connectionId
        ? await resolveBuyerWhatsAppTemplate(prisma, input.credentials.connectionId)
        : null;
    const resolvedTemplate = buyerTemplate?.templateName ?? env.WHATSAPP_RFQ_TEMPLATE_NAME?.trim();
    if (resolvedTemplate) {
        const templated = await sendApprovedTemplate(prisma, input.phone, input.rfqRef, input.body, input.credentials);
        return { metaMessageId: templated.metaMessageId, mode: "template", body: templated.body };
    }
    const interactive = await sendRfqInteractiveSupplierOutreach({
        phone: input.phone,
        conversationId: input.conversationId,
        rfqRef: input.rfqRef,
        senderName: input.senderName,
        body: input.body,
    }, input.credentials);
    return { metaMessageId: interactive.metaMessageId, mode: "interactive", body: interactive.body };
}
export async function sendRfqWhatsAppOpeningInvite(prisma, rfqWorkspaceId, supplierPhone, rfqRef, credentials) {
    const normalized = normalizePhone(supplierPhone);
    if (!normalized)
        return false;
    const conversation = await prisma.whatsAppConversation.findFirst({
        where: {
            contact: { waId: normalized },
            phoneNumberId: credentials.phoneNumberId,
        },
        select: { lastInboundAt: true },
    });
    if (conversation && isWhatsAppServiceWindowOpen(conversation.lastInboundAt)) {
        return false;
    }
    const unifiedConv = await prisma.workspaceConversation.findUnique({
        where: {
            workspaceType_workspaceId: { workspaceType: "RFQ", workspaceId: rfqWorkspaceId },
        },
        select: { id: true, metadata: true },
    });
    if (!unifiedConv)
        return false;
    const meta = typeof unifiedConv.metadata === "object" && unifiedConv.metadata && !Array.isArray(unifiedConv.metadata)
        ? unifiedConv.metadata
        : {};
    if (meta.rfqWhatsAppInviteSentAt)
        return false;
    try {
        let wamid;
        if (env.WHATSAPP_RFQ_TEMPLATE_NAME?.trim()) {
            const templated = await sendApprovedTemplate(prisma, normalized, rfqRef, "DeMaxtore üzerinde yeni bir teklif talebiniz var.", credentials);
            wamid = templated.metaMessageId;
        }
        else {
            const interactive = await sendRfqInteractiveSupplierOutreach({
                phone: normalized,
                conversationId: unifiedConv.id,
                rfqRef,
                body: "DeMaxtore üzerinde yeni bir teklif talebiniz var.",
            }, credentials);
            wamid = interactive.metaMessageId;
        }
        await prisma.workspaceConversation.update({
            where: { id: unifiedConv.id },
            data: {
                metadata: {
                    ...meta,
                    rfqWhatsAppInviteSentAt: new Date().toISOString(),
                },
            },
        });
        logger.info({ rfqWorkspaceId, wamid, buyerId: credentials.buyerId }, "rfq whatsapp opening invite sent");
        return true;
    }
    catch (err) {
        logger.warn({ rfqWorkspaceId, err: String(err), buyerId: credentials.buyerId }, "rfq whatsapp opening invite failed");
        return false;
    }
}
export { resolveContactAndConversation };
//# sourceMappingURL=unified-messaging.whatsapp-outbound.js.map