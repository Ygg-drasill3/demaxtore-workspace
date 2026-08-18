import crypto from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { normalizePhone } from "../../chat/whatsapp.service.js";
const API_VERSION = env.WHATSAPP_API_VERSION;
export class MetaCloudWhatsAppProvider {
    id = "meta_cloud";
    isConfigured() {
        return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
    }
    async sendTemplateMessage(msg) {
        const normalized = normalizePhone(msg.toPhone);
        if (!normalized) {
            return { providerMessageId: null, demo: true, error: "invalid_phone" };
        }
        const token = env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
        if (!token || !phoneNumberId) {
            logger.info({ to: normalized, preview: msg.bodyText.slice(0, 100), url: msg.buttonUrl }, "[WA Bridge] demo send");
            return {
                providerMessageId: `demo-${crypto.randomUUID().slice(0, 12)}`,
                demo: true,
                raw: { mode: "demo" },
            };
        }
        const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            to: normalized,
            type: "interactive",
            interactive: {
                type: "cta_url",
                body: { text: msg.bodyText.slice(0, 1024) },
                action: {
                    name: "cta_url",
                    parameters: {
                        display_text: msg.buttonLabel.slice(0, 20),
                        url: msg.buttonUrl,
                    },
                },
            },
        };
        try {
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
                logger.error({ status: resp.status, err }, "[WA Bridge] send failed");
                return { providerMessageId: null, demo: false, error: err, raw: data };
            }
            return {
                providerMessageId: data.messages?.[0]?.id ?? null,
                demo: false,
                raw: data,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "send_failed";
            logger.error({ err }, "[WA Bridge] send exception");
            return { providerMessageId: null, demo: false, error: message };
        }
    }
}
//# sourceMappingURL=meta-cloud.provider.js.map