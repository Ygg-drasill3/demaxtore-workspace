import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/httpErrors.js";
function graphUrl(path) {
    return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}${path}`;
}
async function graphGet(path, accessToken) {
    const url = new URL(graphUrl(path));
    url.searchParams.set("access_token", accessToken);
    const resp = await fetch(url.toString());
    const data = (await resp.json());
    if (!resp.ok) {
        throw new AppError(502, "META_GRAPH_ERROR", {
            message: data.error?.message ?? resp.statusText,
            code: data.error?.code,
        });
    }
    return data;
}
async function graphPost(path, accessToken, body) {
    const resp = await fetch(graphUrl(path), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const data = (await resp.json());
    if (!resp.ok) {
        throw new AppError(502, "META_GRAPH_ERROR", {
            message: data.error?.message ?? resp.statusText,
            code: data.error?.code,
        });
    }
    return data;
}
async function exchangeCodeForToken(code) {
    const appId = env.WHATSAPP_APP_ID;
    const appSecret = env.WHATSAPP_APP_SECRET;
    if (!appId || !appSecret) {
        throw new AppError(503, "WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED", {
            message: "Meta app credentials are not configured on the platform.",
        });
    }
    const url = new URL(graphUrl("/oauth/access_token"));
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("code", code);
    const resp = await fetch(url.toString());
    const data = (await resp.json());
    if (!resp.ok || !data.access_token) {
        throw new AppError(400, "WHATSAPP_OAUTH_EXCHANGE_FAILED", {
            message: data.error?.message ?? "Failed to exchange authorization code.",
            code: data.error?.code,
        });
    }
    return data;
}
async function exchangeForLongLivedToken(shortLivedToken) {
    const appId = env.WHATSAPP_APP_ID;
    const appSecret = env.WHATSAPP_APP_SECRET;
    const url = new URL(graphUrl("/oauth/access_token"));
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", shortLivedToken);
    const resp = await fetch(url.toString());
    const data = (await resp.json());
    if (!resp.ok || !data.access_token) {
        logger.warn({ err: data.error?.message }, "long-lived token exchange failed — using short-lived token");
        return { access_token: shortLivedToken };
    }
    return data;
}
async function fetchPhoneNumbers(wabaId, accessToken) {
    const data = await graphGet(`/${wabaId}/phone_numbers`, accessToken);
    return data.data ?? [];
}
async function resolveWabaId(accessToken, hint) {
    if (hint)
        return hint;
    const businesses = await graphGet("/me/businesses", accessToken);
    for (const business of businesses.data ?? []) {
        const owned = await graphGet(`/${business.id}/owned_whatsapp_business_accounts`, accessToken);
        const waba = owned.data?.[0];
        if (waba?.id)
            return waba.id;
    }
    throw new AppError(400, "WHATSAPP_WABA_NOT_FOUND", {
        message: "No WhatsApp Business Account found for this authorization.",
    });
}
function assertPhoneBelongsToWaba(phones, phoneNumberId) {
    const phone = phones.find((p) => p.id === phoneNumberId);
    if (!phone) {
        throw new AppError(400, "WHATSAPP_PHONE_OWNERSHIP_INVALID", {
            message: "The selected phone number does not belong to the connected WhatsApp Business Account.",
        });
    }
    return phone;
}
/** Subscribe DeMaxtore app to WABA webhooks after embedded signup. */
export async function subscribeWabaWebhooks(wabaId, accessToken) {
    const appId = env.WHATSAPP_APP_ID;
    if (!appId)
        return;
    try {
        await graphPost(`/${wabaId}/subscribed_apps`, accessToken, {});
        logger.info({ wabaId }, "WABA webhook subscription requested");
    }
    catch (err) {
        logger.warn({ wabaId, err: String(err) }, "WABA webhook subscription failed — manual Meta setup may be required");
    }
}
export async function completeEmbeddedSignup(input) {
    const shortLived = await exchangeCodeForToken(input.code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const tokenExpiresAt = longLived.expires_in != null
        ? new Date(Date.now() + longLived.expires_in * 1000)
        : shortLived.expires_in != null
            ? new Date(Date.now() + shortLived.expires_in * 1000)
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const wabaId = await resolveWabaId(longLived.access_token, input.wabaId);
    const phones = await fetchPhoneNumbers(wabaId, longLived.access_token);
    if (phones.length === 0) {
        throw new AppError(400, "WHATSAPP_PHONE_NOT_FOUND", {
            message: "No phone numbers registered on the connected WhatsApp Business Account.",
        });
    }
    const selected = input.phoneNumberId
        ? assertPhoneBelongsToWaba(phones, input.phoneNumberId)
        : phones[0];
    const metaBusinessId = input.metaBusinessId ?? input.businessId ??
        (await graphGet("/me", longLived.access_token)).id ??
        wabaId;
    await subscribeWabaWebhooks(wabaId, longLived.access_token);
    return {
        accessToken: longLived.access_token,
        tokenExpiresAt,
        metaBusinessId,
        wabaId,
        phoneNumberId: selected.id,
        displayPhoneNumber: selected.display_phone_number,
        verifiedName: selected.verified_name ?? null,
    };
}
export function getEmbeddedSignupConfig() {
    const appId = env.WHATSAPP_APP_ID;
    const configId = env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID;
    if (!appId || !configId) {
        throw new AppError(503, "WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED", {
            message: "Meta Embedded Signup is not configured on this environment.",
        });
    }
    return { appId, configId, apiVersion: env.WHATSAPP_API_VERSION };
}
/** Health check: verify token against Meta debug_token or me endpoint. Does not send messages. */
export async function verifyAccessTokenHealth(accessToken) {
    try {
        await graphGet("/me", accessToken);
        return { ok: true, message: "Connection is healthy." };
    }
    catch (err) {
        const message = err instanceof AppError ? String(err.message) : "Token verification failed.";
        return { ok: false, message };
    }
}
/** Unsubscribe DeMaxtore app from WABA webhooks on disconnect. */
export async function unsubscribeWabaWebhooks(wabaId, accessToken) {
    try {
        const resp = await fetch(graphUrl(`/${wabaId}/subscribed_apps`), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = (await resp.json().catch(() => ({})));
        if (!resp.ok) {
            return {
                ok: false,
                message: data.error?.message ?? `Unsubscribe failed (${resp.status})`,
            };
        }
        return { ok: true, message: "WABA webhook subscription removed." };
    }
    catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Unsubscribe request failed" };
    }
}
export function isTokenRevokedError(code, message) {
    if (code === 190 || code === 102)
        return true;
    const lower = (message ?? "").toLowerCase();
    return lower.includes("revoked") || lower.includes("session has expired") || lower.includes("invalid oauth");
}
//# sourceMappingURL=whatsapp-business-embedded-signup.service.js.map