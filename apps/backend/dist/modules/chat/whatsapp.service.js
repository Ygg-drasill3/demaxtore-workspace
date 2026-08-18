import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
const API_VERSION = env.WHATSAPP_API_VERSION;
export function normalizePhone(phone) {
    if (!phone)
        return null;
    const digits = phone.replace(/\D/g, "");
    return digits || null;
}
export function isWhatsAppConfigured() {
    return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}
function timingSafeEqualHex(expectedHex, providedHex) {
    try {
        const a = Buffer.from(expectedHex, "hex");
        const b = Buffer.from(providedHex, "hex");
        if (a.length !== b.length || a.length === 0)
            return false;
        return crypto.timingSafeEqual(a, b);
    }
    catch {
        return false;
    }
}
/** Fail-closed: missing WHATSAPP_APP_SECRET → reject (never process unsigned webhooks). */
export function validateWebhookSignature(rawBody, signatureHeader) {
    const secret = env.WHATSAPP_APP_SECRET;
    if (!secret) {
        logger.warn("WHATSAPP_APP_SECRET not set — rejecting webhook");
        return { ok: false, reason: "WHATSAPP_APP_SECRET_MISSING" };
    }
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
        return { ok: false, reason: "WHATSAPP_RAW_BODY_MISSING" };
    }
    if (!signatureHeader) {
        return { ok: false, reason: "WHATSAPP_SIGNATURE_MISSING" };
    }
    if (!signatureHeader.startsWith("sha256=")) {
        return { ok: false, reason: "WHATSAPP_SIGNATURE_MALFORMED" };
    }
    const providedHex = signatureHeader.slice(7);
    if (!/^[0-9a-f]{64}$/i.test(providedHex)) {
        return { ok: false, reason: "WHATSAPP_SIGNATURE_MALFORMED" };
    }
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!timingSafeEqualHex(expected, providedHex)) {
        return { ok: false, reason: "WHATSAPP_SIGNATURE_INVALID" };
    }
    return { ok: true };
}
export function verifyWebhookSignature(rawBody, signatureHeader) {
    return validateWebhookSignature(rawBody, signatureHeader).ok;
}
/** Returns true when WHATSAPP_APP_SECRET matches the configured access token (Meta appsecret_proof). */
export async function isWhatsAppAppSecretValidForAccessToken() {
    const secret = env.WHATSAPP_APP_SECRET;
    const token = env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    if (!secret || !token || !phoneNumberId)
        return false;
    const proof = crypto.createHmac("sha256", secret).update(token).digest("hex");
    const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}` +
        `?access_token=${encodeURIComponent(token)}&appsecret_proof=${proof}`;
    try {
        const resp = await fetch(url);
        return resp.ok;
    }
    catch {
        return false;
    }
}
export function verifySubscription(mode, token, challenge) {
    if (mode !== "subscribe" || !challenge)
        return null;
    if (!env.WHATSAPP_VERIFY_TOKEN || token !== env.WHATSAPP_VERIFY_TOKEN)
        return null;
    return challenge;
}
export function parseInboundWebhook(body) {
    const out = [];
    if (body.object !== "whatsapp_business_account")
        return out;
    for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
            if (change.field !== "messages")
                continue;
            const value = change.value ?? {};
            for (const msg of value.messages ?? []) {
                const msgType = msg.type;
                let textBody = "";
                if (msgType === "text") {
                    textBody = (msg.text?.body) ?? "";
                }
                else if (msgType === "button") {
                    textBody = (msg.button?.text) ?? "";
                }
                if (!textBody.trim())
                    continue;
                const fromPhone = normalizePhone(String(msg.from ?? ""));
                if (!fromPhone)
                    continue;
                out.push({
                    fromPhone,
                    whatsappMessageId: msg.id ?? null,
                    messageText: textBody.trim(),
                });
            }
        }
    }
    return out;
}
export async function sendTextMessage(toPhone, text) {
    const normalized = normalizePhone(toPhone);
    if (!normalized)
        return { id: null, demo: true, error: "invalid_phone" };
    const token = env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
        logger.info({ to: normalized, preview: text.slice(0, 80) }, "[WA] demo send");
        return { id: `demo-${crypto.randomUUID().slice(0, 12)}`, demo: true };
    }
    const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: normalized,
                type: "text",
                text: { body: text.slice(0, 4096) },
            }),
        });
        const data = (await resp.json());
        if (!resp.ok) {
            const err = data.error?.message ?? resp.statusText;
            logger.error({ status: resp.status, err }, "[WA] send failed");
            return { id: null, demo: false, error: err };
        }
        return { id: data.messages?.[0]?.id ?? null, demo: false };
    }
    catch (err) {
        logger.error({ err }, "[WA] send exception");
        return { id: null, demo: false, error: err instanceof Error ? err.message : "send_failed" };
    }
}
export function integrationStatus() {
    const missing = [];
    if (!env.WHATSAPP_ACCESS_TOKEN)
        missing.push("WHATSAPP_ACCESS_TOKEN");
    if (!env.WHATSAPP_PHONE_NUMBER_ID)
        missing.push("WHATSAPP_PHONE_NUMBER_ID");
    if (!env.WHATSAPP_VERIFY_TOKEN)
        missing.push("WHATSAPP_VERIFY_TOKEN");
    if (!env.WHATSAPP_APP_SECRET)
        missing.push("WHATSAPP_APP_SECRET");
    if (missing.length) {
        logger.warn({ missing }, "[WA] WhatsApp env incomplete — demo mode");
    }
    return {
        mode: isWhatsAppConfigured() ? "live" : "demo",
        webhookUrl: `${env.APP_BASE_URL.replace(/\/$/, "")}/api/webhooks/whatsapp`,
        verifyTokenConfigured: Boolean(env.WHATSAPP_VERIFY_TOKEN),
        phoneNumberIdConfigured: Boolean(env.WHATSAPP_PHONE_NUMBER_ID),
        accessTokenConfigured: Boolean(env.WHATSAPP_ACCESS_TOKEN),
        appSecretConfigured: Boolean(env.WHATSAPP_APP_SECRET),
        apiVersion: API_VERSION,
        missingEnv: missing,
    };
}
//# sourceMappingURL=whatsapp.service.js.map