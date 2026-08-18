import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
const API_BASE = env.FREIGHTIQ_API_URL.replace(/\/$/, "");
/** workspaceRfqId ↔ freightIqRfqId linkage for unified conversations. */
export class ConversationLinkService {
    db;
    constructor(db) {
        this.db = db;
    }
    async findFreightIqRfqId(workspaceRfqId) {
        const linked = await this.db.directConversation.findFirst({
            where: { workspaceRfqId, freightIqRfqId: { not: null } },
            select: { freightIqRfqId: true },
        });
        return linked?.freightIqRfqId ?? null;
    }
    async findByFreightIqRfqId(freightIqRfqId) {
        return this.db.directConversation.findMany({
            where: { freightIqRfqId },
            orderBy: { updatedAt: "desc" },
        });
    }
    async linkFreightIqRfqId(workspaceRfqId, freightIqRfqId) {
        await this.db.directConversation.updateMany({
            where: { workspaceRfqId },
            data: { freightIqRfqId },
        });
        const ws = await this.db.workspace.findUnique({
            where: { id: workspaceRfqId },
            select: { createdById: true, externalRef: true },
        });
        if (!ws)
            return freightIqRfqId;
        const systemPeerKey = "__freightiq_link__";
        const existing = await this.db.directConversation.findFirst({
            where: { workspaceRfqId, peerKey: systemPeerKey },
        });
        if (!existing) {
            await this.db.directConversation.create({
                data: {
                    contextType: "RFQ",
                    contextWorkspaceId: workspaceRfqId,
                    buyerUserId: ws.createdById,
                    peerKey: systemPeerKey,
                    peerName: "FreightIQ",
                    contextRef: ws.externalRef,
                    workspaceRfqId,
                    freightIqRfqId,
                    status: "system",
                },
            });
        }
        else if (existing.freightIqRfqId !== freightIqRfqId) {
            await this.db.directConversation.update({
                where: { id: existing.id },
                data: { freightIqRfqId },
            });
        }
        return freightIqRfqId;
    }
    /** Sync with FreightIQ API when bridge is configured; never throws. */
    async syncFreightIqRfqId(workspaceRfqId, actorUserId, freightToken, actorRole = "BUYER") {
        const existing = await this.findFreightIqRfqId(workspaceRfqId);
        if (existing)
            return existing;
        if (!freightToken || !API_BASE) {
            logger.debug({ workspaceRfqId }, "[Chat] FreightIQ sync skipped — no token or API base");
            return null;
        }
        const ws = await this.db.workspace.findFirst({
            where: {
                id: workspaceRfqId,
                type: "RFQ",
                ...(actorRole === "BUYER" ? { createdById: actorUserId } : {}),
            },
            include: { rfqDetails: { select: { title: true, productCategory: true } } },
        });
        if (!ws?.externalRef)
            return null;
        const spawnedOrder = await this.db.workspace.findFirst({
            where: { spawnedFromId: workspaceRfqId, type: "ORDER" },
            include: { orderWorkspace: { select: { originPort: true, destinationPort: true } } },
        });
        try {
            const res = await fetch(`${API_BASE}/workspace/rfqs/sync`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${freightToken}`,
                },
                body: JSON.stringify({
                    workspaceRfqId,
                    workspaceExternalRef: ws.externalRef,
                    title: ws.rfqDetails?.title ?? ws.externalRef,
                    originPort: spawnedOrder?.orderWorkspace?.originPort ?? "CNSHA",
                    destinationPort: spawnedOrder?.orderWorkspace?.destinationPort ?? "NLRTM",
                    cargoType: ws.rfqDetails?.productCategory ?? "General Cargo",
                }),
            });
            if (!res.ok) {
                const body = await res.text().catch(() => "");
                logger.warn({ workspaceRfqId, status: res.status, body: body.slice(0, 300) }, "[Chat] FreightIQ RFQ sync failed — conversations remain workspace-scoped");
                return null;
            }
            const data = (await res.json());
            if (!data.rfqId)
                return null;
            await this.linkFreightIqRfqId(workspaceRfqId, data.rfqId);
            return data.rfqId;
        }
        catch (err) {
            logger.warn({ err, workspaceRfqId }, "[Chat] FreightIQ RFQ sync request failed");
            return null;
        }
    }
    async resolveWorkspaceRfqId(opts) {
        if (opts.workspaceRfqId) {
            const freightIqRfqId = opts.freightIqRfqId ?? (await this.findFreightIqRfqId(opts.workspaceRfqId));
            return { workspaceRfqId: opts.workspaceRfqId, freightIqRfqId };
        }
        if (opts.freightIqRfqId) {
            const conv = await this.db.directConversation.findFirst({
                where: { freightIqRfqId: opts.freightIqRfqId, workspaceRfqId: { not: null } },
                select: { workspaceRfqId: true, freightIqRfqId: true },
            });
            if (conv?.workspaceRfqId) {
                return {
                    workspaceRfqId: conv.workspaceRfqId,
                    freightIqRfqId: conv.freightIqRfqId,
                };
            }
            return { workspaceRfqId: null, freightIqRfqId: opts.freightIqRfqId };
        }
        return { workspaceRfqId: null, freightIqRfqId: null };
    }
}
//# sourceMappingURL=conversation-link.service.js.map