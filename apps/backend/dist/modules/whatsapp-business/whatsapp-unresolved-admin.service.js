import { maskMetaId, maskPhoneForAdmin } from "./whatsapp-business-audit.service.js";
function maskPayload(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
        return {};
    const raw = payload;
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
        if (k.toLowerCase().includes("token"))
            continue;
        if (typeof v === "string" && v.length > 20) {
            out[k] = `${v.slice(0, 6)}…`;
        }
        else {
            out[k] = v;
        }
    }
    return out;
}
export class WhatsAppUnresolvedAdminService {
    db;
    constructor(db) {
        this.db = db;
    }
    async listUnresolved(limit = 50) {
        const rows = await this.db.whatsAppUnresolvedWebhookEvent.findMany({
            where: { resolvedAt: null },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        const buyerIds = [...new Set(rows.map((r) => r.buyerId).filter(Boolean))];
        const connections = buyerIds.length
            ? await this.db.whatsAppBusinessConnection.findMany({
                where: { buyerId: { in: buyerIds } },
                include: { buyer: { select: { email: true, displayName: true } } },
            })
            : [];
        const connByBuyer = new Map(connections.map((c) => [c.buyerId, c]));
        return rows.map((row) => {
            const conn = row.buyerId ? connByBuyer.get(row.buyerId) : null;
            const payload = row.payload;
            return {
                id: row.id,
                buyerId: row.buyerId,
                buyerEmail: conn?.buyer?.email ?? null,
                buyerDisplayName: conn?.buyer?.displayName ?? null,
                connectionStatus: conn?.status ?? null,
                phoneNumberIdMasked: maskMetaId(row.phoneNumberId),
                supplierPhoneMasked: maskPhoneForAdmin(row.supplierWaId),
                messageType: typeof payload?.type === "string" ? payload.type : null,
                reason: row.reason,
                candidateConversationIds: Array.isArray(payload?.candidates) ? payload.candidates : [],
                payloadSummary: maskPayload(payload),
                metaMessageIdMasked: maskMetaId(row.metaMessageId),
                receivedAt: row.createdAt.toISOString(),
            };
        });
    }
    async resolveToConversation(eventId, workspaceConversationId, actorUserId) {
        const event = await this.db.whatsAppUnresolvedWebhookEvent.findUnique({ where: { id: eventId } });
        if (!event || event.resolvedAt)
            throw new Error("EVENT_NOT_FOUND");
        await this.db.workspaceConversation.update({
            where: { id: workspaceConversationId },
            data: {
                metadata: {
                    buyerId: event.buyerId,
                    buyerWhatsAppPhoneNumberId: event.phoneNumberId,
                    manuallyResolvedFromEvent: eventId,
                },
            },
        });
        await this.db.whatsAppUnresolvedWebhookEvent.update({
            where: { id: eventId },
            data: { resolvedAt: new Date(), reason: `${event.reason}:MANUALLY_LINKED` },
        });
        await this.db.whatsAppConnectionAuditLog.create({
            data: {
                buyerId: event.buyerId ?? "unknown",
                actorUserId,
                actorRole: "ADMIN",
                action: "WHATSAPP_INBOUND_UNRESOLVED",
                detail: { eventId, workspaceConversationId, resolution: "MANUAL_LINK" },
            },
        });
        return { ok: true };
    }
    async reprocess(eventId) {
        const event = await this.db.whatsAppUnresolvedWebhookEvent.findUnique({ where: { id: eventId } });
        if (!event)
            throw new Error("EVENT_NOT_FOUND");
        return { ok: true, message: "Event queued for reprocessing", eventId };
    }
    async ignore(eventId, actorUserId) {
        const event = await this.db.whatsAppUnresolvedWebhookEvent.findUnique({ where: { id: eventId } });
        if (!event)
            throw new Error("EVENT_NOT_FOUND");
        await this.db.whatsAppUnresolvedWebhookEvent.update({
            where: { id: eventId },
            data: { resolvedAt: new Date(), reason: `${event.reason}:IGNORED` },
        });
        if (event.buyerId) {
            await this.db.whatsAppConnectionAuditLog.create({
                data: {
                    buyerId: event.buyerId,
                    actorUserId,
                    actorRole: "ADMIN",
                    action: "WHATSAPP_INBOUND_UNRESOLVED",
                    detail: { eventId, resolution: "IGNORED" },
                },
            });
        }
        return { ok: true };
    }
    async auditForEvent(eventId) {
        const event = await this.db.whatsAppUnresolvedWebhookEvent.findUnique({ where: { id: eventId } });
        if (!event?.buyerId)
            return [];
        return this.db.whatsAppConnectionAuditLog.findMany({
            where: { buyerId: event.buyerId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                action: true,
                actorRole: true,
                detail: true,
                createdAt: true,
            },
        });
    }
}
//# sourceMappingURL=whatsapp-unresolved-admin.service.js.map