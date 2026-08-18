import { env, isBuyerConnectionWhatsAppMode } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
function buildPayload(input) {
    const to = normalizePhone(input.to);
    if (!to)
        throw new Error("INVALID_PHONE");
    const base = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
    };
    if (input.replyToMetaId) {
        base.context = { message_id: input.replyToMetaId };
    }
    switch (input.type) {
        case "text":
            base.type = "text";
            base.text = { body: (input.text ?? "").slice(0, 4096), preview_url: false };
            break;
        case "template":
            base.type = "template";
            base.template = {
                name: input.templateName,
                language: { code: input.templateLanguage ?? "en" },
                components: input.templateComponents ?? [],
            };
            break;
        case "image":
            base.type = "image";
            base.image = input.mediaId
                ? { id: input.mediaId, caption: input.caption?.slice(0, 1024) }
                : { link: input.mediaUrl, caption: input.caption?.slice(0, 1024) };
            break;
        case "document":
            base.type = "document";
            base.document = input.mediaId
                ? { id: input.mediaId, caption: input.caption?.slice(0, 1024), filename: input.filename }
                : { link: input.mediaUrl, caption: input.caption?.slice(0, 1024), filename: input.filename };
            break;
        case "interactive":
            base.type = "interactive";
            base.interactive = {
                type: "cta_url",
                body: { text: (input.interactiveBody ?? "").slice(0, 1024) },
                action: {
                    name: "cta_url",
                    parameters: {
                        display_text: (input.interactiveButtonLabel ?? "Open").slice(0, 20),
                        url: input.interactiveButtonUrl ?? "https://workspace.demaxtore.com",
                    },
                },
            };
            break;
        default:
            throw new Error("UNSUPPORTED_MESSAGE_TYPE");
    }
    return base;
}
export async function sendWhatsAppMessage(input) {
    const normalized = normalizePhone(input.to);
    if (!normalized)
        return { metaMessageId: null, demo: true, error: "invalid_phone", errorCode: "INVALID_PHONE" };
    const token = input.credentials?.accessToken ?? (isBuyerConnectionWhatsAppMode() ? undefined : env.WHATSAPP_ACCESS_TOKEN);
    const phoneNumberId = input.credentials?.phoneNumberId ?? (isBuyerConnectionWhatsAppMode() ? undefined : env.WHATSAPP_PHONE_NUMBER_ID);
    if (!token || !phoneNumberId) {
        if (env.NODE_ENV === "test" && !input.credentials) {
            logger.info({ to: normalized, type: input.type }, "[WA-Inbox] demo send (test only)");
            return { metaMessageId: `demo-${Date.now()}`, demo: true };
        }
        logger.error({ to: normalized, type: input.type }, "[WA-Inbox] credentials missing — refusing send");
        return {
            metaMessageId: null,
            demo: false,
            error: "WhatsApp Cloud API credentials are not configured",
            errorCode: "WHATSAPP_NOT_CONFIGURED",
        };
    }
    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
    try {
        const payload = buildPayload(input);
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        const data = (await resp.json());
        if (!resp.ok) {
            const err = data.error?.message ?? resp.statusText;
            logger.error({ status: resp.status, code: data.error?.code, buyerId: input.credentials?.buyerId }, "[WA-Inbox] send failed");
            return {
                metaMessageId: null,
                demo: false,
                error: err,
                errorCode: data.error?.code != null ? String(data.error.code) : "META_API_ERROR",
            };
        }
        return { metaMessageId: data.messages?.[0]?.id ?? null, demo: false };
    }
    catch (err) {
        logger.error({ err, buyerId: input.credentials?.buyerId }, "[WA-Inbox] send exception");
        return {
            metaMessageId: null,
            demo: false,
            error: err instanceof Error ? err.message : "send_failed",
            errorCode: "SEND_EXCEPTION",
        };
    }
}
export function validateE164Phone(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized)
        return false;
    return normalized.length >= 10 && normalized.length <= 15;
}
//# sourceMappingURL=whatsapp-inbox.send.js.map