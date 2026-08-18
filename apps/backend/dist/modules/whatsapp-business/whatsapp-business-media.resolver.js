import { env, isBuyerConnectionWhatsAppMode } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { decryptSecret } from "../../lib/secret-crypto.js";
const USABLE_MEDIA_STATUSES = new Set(["CONNECTED", "PENDING"]);
export async function resolveMediaAccessCredentials(db, phoneNumberId) {
    if (!phoneNumberId) {
        if (isBuyerConnectionWhatsAppMode())
            return null;
        const token = env.WHATSAPP_ACCESS_TOKEN;
        if (!token)
            return null;
        return {
            accessToken: token,
            buyerId: "platform",
            phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? "platform",
            connectionId: "platform",
        };
    }
    const connection = await db.whatsAppBusinessConnection.findUnique({
        where: { phoneNumberId },
        select: {
            id: true,
            buyerId: true,
            phoneNumberId: true,
            encryptedAccessToken: true,
            status: true,
            tokenExpiresAt: true,
        },
    });
    if (!connection) {
        if (isBuyerConnectionWhatsAppMode())
            return null;
        const token = env.WHATSAPP_ACCESS_TOKEN;
        if (!token)
            return null;
        return {
            accessToken: token,
            buyerId: "platform",
            phoneNumberId,
            connectionId: "platform",
        };
    }
    if (!USABLE_MEDIA_STATUSES.has(connection.status)) {
        logger.info({ phoneNumberId, status: connection.status, buyerId: connection.buyerId }, "[WA-Inbox] media download blocked — connection not active");
        return null;
    }
    if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() < Date.now()) {
        await db.whatsAppBusinessConnection.update({
            where: { id: connection.id },
            data: { status: "EXPIRED", lastErrorCode: "TOKEN_EXPIRED" },
        });
        return null;
    }
    return {
        accessToken: decryptSecret(connection.encryptedAccessToken),
        buyerId: connection.buyerId,
        phoneNumberId: connection.phoneNumberId,
        connectionId: connection.id,
    };
}
/** Prevent cross-tenant media fetch when caller knows expected buyer. */
export function assertMediaCredentialTenant(creds, expectedBuyerId) {
    if (creds.buyerId !== expectedBuyerId) {
        throw new Error("WHATSAPP_MEDIA_CREDENTIAL_ISOLATION");
    }
}
//# sourceMappingURL=whatsapp-business-media.resolver.js.map