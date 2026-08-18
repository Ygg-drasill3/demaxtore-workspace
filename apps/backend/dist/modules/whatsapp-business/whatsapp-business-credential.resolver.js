import { AppError } from "../../utils/httpErrors.js";
import { decryptSecret } from "../../lib/secret-crypto.js";
import { isBuyerConnectionWhatsAppMode } from "../../config/env.js";
import { logWhatsAppConnectionAudit } from "./whatsapp-business-audit.service.js";
const ACTIVE_STATUSES = new Set(["CONNECTED", "PENDING"]);
export function mapConnectionToCredentials(row) {
    return {
        buyerId: row.buyerId,
        phoneNumberId: row.phoneNumberId,
        accessToken: decryptSecret(row.encryptedAccessToken),
        displayPhoneNumber: row.displayPhoneNumber ?? "",
        wabaId: row.wabaId,
        metaBusinessId: row.metaBusinessId ?? row.wabaId,
        verifiedName: row.verifiedName,
        connectionId: row.id,
    };
}
export async function findConnectionByPhoneNumberId(db, phoneNumberId) {
    return db.whatsAppBusinessConnection.findUnique({ where: { phoneNumberId } });
}
export async function resolveBuyerWhatsAppCredentials(db, buyerId) {
    const row = await db.whatsAppBusinessConnection.findUnique({ where: { buyerId } });
    if (!row)
        return null;
    if (row.status === "EXPIRED" || row.status === "REVOKED")
        return null;
    if (!ACTIVE_STATUSES.has(row.status))
        return null;
    if (row.tokenExpiresAt && row.tokenExpiresAt.getTime() < Date.now()) {
        await db.whatsAppBusinessConnection.update({
            where: { id: row.id },
            data: { status: "EXPIRED", lastErrorCode: "TOKEN_EXPIRED" },
        });
        return null;
    }
    return mapConnectionToCredentials(row);
}
export async function requireBuyerWhatsAppCredentials(db, buyerId) {
    const row = await db.whatsAppBusinessConnection.findUnique({ where: { buyerId } });
    if (!row) {
        if (isBuyerConnectionWhatsAppMode()) {
            throw new AppError(400, "WHATSAPP_BUSINESS_NOT_CONNECTED", {
                message: "Connect your WhatsApp Business account in Settings → Integrations before sending messages.",
            });
        }
        return null;
    }
    if (row.status === "EXPIRED" || row.status === "REVOKED") {
        throw new AppError(401, "WHATSAPP_CONNECTION_REAUTH_REQUIRED", {
            message: "Your WhatsApp Business connection requires re-authentication. Please reconnect in Settings.",
        });
    }
    if (!ACTIVE_STATUSES.has(row.status)) {
        throw new AppError(400, "WHATSAPP_BUSINESS_NOT_CONNECTED", {
            message: "Connect your WhatsApp Business account in Settings → Integrations before sending messages.",
        });
    }
    if (row.tokenExpiresAt && row.tokenExpiresAt.getTime() < Date.now()) {
        await db.whatsAppBusinessConnection.update({
            where: { id: row.id },
            data: { status: "EXPIRED", lastErrorCode: "TOKEN_EXPIRED" },
        });
        throw new AppError(401, "WHATSAPP_CONNECTION_REAUTH_REQUIRED", {
            message: "Your WhatsApp Business token has expired. Please reconnect.",
        });
    }
    return mapConnectionToCredentials(row);
}
export async function resolveBuyerIdForConversation(db, conversationId, sender) {
    if (sender.role === "BUYER")
        return sender.id;
    const ownerParticipant = await db.workspaceConversationParticipant.findFirst({
        where: {
            conversationId,
            participantRole: "OWNER",
            leftAt: null,
            userId: { not: null },
        },
        select: { userId: true },
    });
    if (!ownerParticipant?.userId)
        return null;
    const owner = await db.user.findUnique({
        where: { id: ownerParticipant.userId },
        select: { id: true, role: true },
    });
    if (owner?.role === "BUYER")
        return owner.id;
    return null;
}
export async function assertBuyerCredentialIsolation(_db, requestingBuyerId, credentials) {
    if (credentials.buyerId !== requestingBuyerId) {
        await logWhatsAppConnectionAudit(_db, {
            buyerId: requestingBuyerId,
            connectionId: credentials.connectionId,
            action: "WHATSAPP_OUTBOUND_BLOCKED",
            detail: { reason: "credential_isolation_violation" },
        });
        throw new AppError(403, "WHATSAPP_CREDENTIAL_ISOLATION", {
            message: "Cannot use another buyer's WhatsApp Business credentials.",
        });
    }
}
//# sourceMappingURL=whatsapp-business-credential.resolver.js.map