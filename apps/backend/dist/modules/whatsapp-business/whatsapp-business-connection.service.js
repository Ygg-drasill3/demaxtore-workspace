import { AppError } from "../../utils/httpErrors.js";
import { encryptSecret } from "../../lib/secret-crypto.js";
import { completeEmbeddedSignup, getEmbeddedSignupConfig, isTokenRevokedError, unsubscribeWabaWebhooks, verifyAccessTokenHealth, } from "./whatsapp-business-embedded-signup.service.js";
import { logWhatsAppConnectionAudit, maskMetaId } from "./whatsapp-business-audit.service.js";
import { upsertDefaultBuyerTemplate } from "./whatsapp-template.service.js";
import { env } from "../../config/env.js";
function healthFromStatus(status, lastErrorMessage) {
    switch (status) {
        case "CONNECTED":
            return lastErrorMessage ? "degraded" : "healthy";
        case "EXPIRED":
        case "REVOKED":
            return "reauth_required";
        case "DISCONNECTED":
            return "disconnected";
        case "ERROR":
            return "degraded";
        default:
            return "not_connected";
    }
}
function toBuyerDto(row) {
    if (!row) {
        return {
            status: "DISCONNECTED",
            connected: false,
            businessName: null,
            verifiedName: null,
            displayPhoneNumber: null,
            connectedAt: null,
            healthStatus: "not_connected",
            lastHealthCheckAt: null,
            lastErrorMessage: null,
        };
    }
    const connected = row.status === "CONNECTED" || row.status === "PENDING";
    return {
        status: row.status,
        connected,
        businessName: row.verifiedName ?? row.displayPhoneNumber ?? null,
        verifiedName: row.verifiedName,
        displayPhoneNumber: row.displayPhoneNumber,
        connectedAt: row.connectedAt?.toISOString() ?? null,
        healthStatus: healthFromStatus(row.status, row.lastErrorMessage),
        lastHealthCheckAt: row.lastHealthCheckAt?.toISOString() ?? null,
        lastErrorMessage: row.lastErrorMessage,
    };
}
function toAdminDto(row) {
    const buyer = toBuyerDto(row);
    return {
        ...buyer,
        id: row.id,
        buyerId: row.buyerId,
        buyerEmail: row.buyer?.email ?? null,
        buyerDisplayName: row.buyer?.displayName ?? null,
        phoneNumberIdMasked: maskMetaId(row.phoneNumberId),
        wabaIdMasked: maskMetaId(row.wabaId),
        metaBusinessIdMasked: maskMetaId(row.metaBusinessId),
        tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
        disconnectedAt: row.disconnectedAt?.toISOString() ?? null,
    };
}
export class WhatsAppBusinessConnectionService {
    db;
    constructor(db) {
        this.db = db;
    }
    assertBuyer(actor) {
        if (actor.role !== "BUYER") {
            throw new AppError(403, "FORBIDDEN", { message: "Only buyers can manage WhatsApp Business connections." });
        }
        return actor.id;
    }
    getEmbeddedSignupConfig() {
        return getEmbeddedSignupConfig();
    }
    async getConnectionForBuyer(actor) {
        const buyerId = this.assertBuyer(actor);
        const row = await this.db.whatsAppBusinessConnection.findUnique({ where: { buyerId } });
        return toBuyerDto(row);
    }
    async listConnectionsForAdmin() {
        const rows = await this.db.whatsAppBusinessConnection.findMany({
            include: { buyer: { select: { email: true, displayName: true } } },
            orderBy: { updatedAt: "desc" },
        });
        return rows.map(toAdminDto);
    }
    async connect(actor, input) {
        const buyerId = this.assertBuyer(actor);
        const buyer = await this.db.user.findUnique({ where: { id: buyerId }, select: { role: true } });
        if (!buyer || buyer.role !== "BUYER") {
            throw new AppError(403, "FORBIDDEN", { message: "WhatsApp Business connections are for buyer accounts only." });
        }
        let signup;
        try {
            signup = await completeEmbeddedSignup(input);
        }
        catch (err) {
            await logWhatsAppConnectionAudit(this.db, {
                buyerId,
                actorUserId: actor.id,
                actorRole: actor.role,
                action: "WHATSAPP_CONNECTION_ERROR",
                detail: { stage: "embedded_signup", error: err instanceof AppError ? err.code : "UNKNOWN" },
            });
            throw err;
        }
        const encryptedAccessToken = encryptSecret(signup.accessToken);
        const existingByPhone = await this.db.whatsAppBusinessConnection.findUnique({
            where: { phoneNumberId: signup.phoneNumberId },
        });
        if (existingByPhone && existingByPhone.buyerId !== buyerId) {
            throw new AppError(409, "WHATSAPP_PHONE_ALREADY_CONNECTED", {
                message: "This WhatsApp Business phone number is already connected to another buyer account.",
            });
        }
        const now = new Date();
        const row = await this.db.whatsAppBusinessConnection.upsert({
            where: { buyerId },
            create: {
                buyerId,
                metaBusinessId: signup.metaBusinessId,
                wabaId: signup.wabaId,
                phoneNumberId: signup.phoneNumberId,
                displayPhoneNumber: signup.displayPhoneNumber,
                verifiedName: signup.verifiedName,
                encryptedAccessToken,
                tokenExpiresAt: signup.tokenExpiresAt,
                status: "CONNECTED",
                connectedAt: now,
                disconnectedAt: null,
                lastHealthCheckAt: now,
                lastErrorCode: null,
                lastErrorMessage: null,
            },
            update: {
                metaBusinessId: signup.metaBusinessId,
                wabaId: signup.wabaId,
                phoneNumberId: signup.phoneNumberId,
                displayPhoneNumber: signup.displayPhoneNumber,
                verifiedName: signup.verifiedName,
                encryptedAccessToken,
                tokenExpiresAt: signup.tokenExpiresAt,
                status: "CONNECTED",
                connectedAt: now,
                disconnectedAt: null,
                lastHealthCheckAt: now,
                lastErrorCode: null,
                lastErrorMessage: null,
            },
        });
        if (env.WHATSAPP_RFQ_TEMPLATE_NAME?.trim()) {
            await upsertDefaultBuyerTemplate(this.db, row.id, env.WHATSAPP_RFQ_TEMPLATE_NAME.trim());
        }
        await logWhatsAppConnectionAudit(this.db, {
            buyerId,
            connectionId: row.id,
            actorUserId: actor.id,
            actorRole: actor.role,
            action: existingByPhone ? "WHATSAPP_RECONNECTED" : "WHATSAPP_CONNECTED",
            detail: { phoneNumberIdMasked: maskMetaId(signup.phoneNumberId) },
        });
        return toBuyerDto(row);
    }
    prepareReconnect(actor) {
        this.assertBuyer(actor);
        return {
            ready: true,
            message: "Launch Meta Embedded Signup to reconnect your WhatsApp Business account.",
        };
    }
    async disconnect(actor) {
        const buyerId = this.assertBuyer(actor);
        const existing = await this.db.whatsAppBusinessConnection.findUnique({ where: { buyerId } });
        if (!existing) {
            throw new AppError(404, "WHATSAPP_BUSINESS_NOT_CONNECTED");
        }
        // Mark disconnected immediately — blocks outbound resolver and inbound routing before unsubscribe completes.
        await this.db.whatsAppBusinessConnection.update({
            where: { buyerId },
            data: {
                status: "DISCONNECTED",
                disconnectedAt: new Date(),
                lastErrorCode: null,
                lastErrorMessage: null,
            },
        });
        let unsubscribe = { ok: false, message: "Token not decrypted after disconnect." };
        // Unsubscribe requires one-time token decrypt; connection is already DISCONNECTED so resolver won't use it.
        if (existing.status === "CONNECTED" || existing.status === "PENDING") {
            const { decryptSecret } = await import("../../lib/secret-crypto.js");
            const token = decryptSecret(existing.encryptedAccessToken);
            unsubscribe = await unsubscribeWabaWebhooks(existing.wabaId, token);
            if (!unsubscribe.ok) {
                await this.db.whatsAppBusinessConnection.update({
                    where: { buyerId },
                    data: {
                        lastErrorCode: "UNSUBSCRIBE_FAILED",
                        lastErrorMessage: unsubscribe.message,
                    },
                });
            }
        }
        await logWhatsAppConnectionAudit(this.db, {
            buyerId,
            connectionId: existing.id,
            actorUserId: actor.id,
            actorRole: actor.role,
            action: "WHATSAPP_DISCONNECTED",
            detail: { unsubscribeOk: unsubscribe.ok, unsubscribeMessage: unsubscribe.message },
        });
        return { ok: true, unsubscribe };
    }
    async testConnection(actor) {
        const buyerId = this.assertBuyer(actor);
        const row = await this.db.whatsAppBusinessConnection.findUnique({ where: { buyerId } });
        if (!row || row.status === "DISCONNECTED") {
            throw new AppError(404, "WHATSAPP_BUSINESS_NOT_CONNECTED");
        }
        if (row.status === "EXPIRED" || row.status === "REVOKED") {
            throw new AppError(401, "WHATSAPP_CONNECTION_REAUTH_REQUIRED", {
                message: "Your WhatsApp Business connection requires re-authentication.",
            });
        }
        const { decryptSecret } = await import("../../lib/secret-crypto.js");
        const token = decryptSecret(row.encryptedAccessToken);
        const result = await verifyAccessTokenHealth(token);
        const checkedAt = new Date();
        await this.db.whatsAppBusinessConnection.update({
            where: { id: row.id },
            data: {
                lastHealthCheckAt: checkedAt,
                lastErrorCode: result.ok ? null : "HEALTH_CHECK_FAILED",
                lastErrorMessage: result.ok ? null : result.message,
                status: result.ok ? "CONNECTED" : "ERROR",
            },
        });
        await logWhatsAppConnectionAudit(this.db, {
            buyerId,
            connectionId: row.id,
            actorUserId: actor.id,
            actorRole: actor.role,
            action: result.ok ? "WHATSAPP_HEALTH_CHECK_OK" : "WHATSAPP_HEALTH_CHECK_FAILED",
            detail: { message: result.message },
        });
        return {
            ok: result.ok,
            healthStatus: result.ok ? "healthy" : "degraded",
            message: result.message,
            checkedAt: checkedAt.toISOString(),
        };
    }
    async markRevoked(buyerId) {
        const row = await this.db.whatsAppBusinessConnection.findUnique({ where: { buyerId } });
        if (!row)
            return;
        await this.db.whatsAppBusinessConnection.updateMany({
            where: { buyerId, status: { in: ["CONNECTED", "PENDING"] } },
            data: { status: "REVOKED", lastErrorCode: "TOKEN_REVOKED" },
        });
        await logWhatsAppConnectionAudit(this.db, {
            buyerId,
            connectionId: row.id,
            action: "WHATSAPP_TOKEN_REVOKED",
        });
    }
    async handleMetaSendError(buyerId, errorCode, errorMessage) {
        const code = errorCode != null ? Number(errorCode) : undefined;
        if (isTokenRevokedError(code, errorMessage)) {
            await this.markRevoked(buyerId);
        }
    }
}
//# sourceMappingURL=whatsapp-business-connection.service.js.map