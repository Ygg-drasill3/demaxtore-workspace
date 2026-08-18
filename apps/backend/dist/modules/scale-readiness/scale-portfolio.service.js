import { isUnknownActivityDays, UNKNOWN_DAYS_SINCE_ACTIVITY } from "@dmx/contracts/activity-days";
import { ScaleAccountService } from "./scale-account.service.js";
function activityFrom(date, eventType) {
    if (!date) {
        return { lastActivityAt: null, daysSinceActivity: UNKNOWN_DAYS_SINCE_ACTIVITY, lastEventType: eventType ?? null };
    }
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    return {
        lastActivityAt: date.toISOString(),
        daysSinceActivity: days,
        lastEventType: eventType ?? null,
    };
}
function commercialScore(params) {
    let score = 50;
    score += Math.min(25, params.revenue / 500);
    score += Math.min(10, params.volume);
    if (!isUnknownActivityDays(params.daysSince)) {
        if (params.daysSince <= 7)
            score += 15;
        else if (params.daysSince <= 30)
            score += 5;
        score -= Math.min(50, params.daysSince * 1.2);
    }
    return Math.max(0, Math.min(100, Math.round(score)));
}
export class ScalePortfolioService {
    db;
    accounts;
    constructor(db) {
        this.db = db;
        this.accounts = new ScaleAccountService(db);
    }
    async listBuyerHealth() {
        const buyers = await this.db.user.findMany({
            where: { role: "BUYER", organisationId: { not: null } },
            include: { organisation: true },
        });
        const byOrg = new Map();
        for (const b of buyers) {
            const oid = b.organisationId;
            const list = byOrg.get(oid) ?? [];
            list.push(b);
            byOrg.set(oid, list);
        }
        const results = [];
        for (const [orgId, users] of byOrg) {
            const org = users[0].organisation;
            const userIds = users.map((u) => u.id);
            const rfqs = await this.db.workspace.findMany({
                where: { type: "RFQ", createdById: { in: userIds } },
                select: { id: true, state: true, updatedAt: true },
            });
            const rfqIds = rfqs.map((r) => r.id);
            const orders = await this.db.workspace.findMany({
                where: { type: "ORDER", spawnedFromId: { in: rfqIds.length ? rfqIds : ["00000000-0000-0000-0000-000000000000"] } },
                select: { id: true, state: true, updatedAt: true },
            });
            const orderIds = orders.map((o) => o.id);
            const shipments = await this.db.workspace.findMany({
                where: {
                    type: "SHIPMENT",
                    OR: [
                        { spawnedFromId: { in: orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"] } },
                    ],
                },
                select: { id: true, updatedAt: true },
            });
            const freightCount = orderIds.length
                ? await this.db.freightRequest.count({ where: { orderId: { in: orderIds } } })
                : 0;
            const ledger = orderIds.length
                ? await this.db.freightRevenueLedger.aggregate({
                    where: { orderId: { in: orderIds }, status: { in: ["PENDING", "REALIZED"] } },
                    _sum: { freightiqMarginUsd: true },
                })
                : { _sum: { freightiqMarginUsd: null } };
            const lastWs = [...rfqs, ...orders, ...shipments].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
            const lastTimeline = await this.db.timelineEvent.findFirst({
                where: {
                    workspaceId: {
                        in: [...rfqIds, ...orderIds, ...shipments.map((s) => s.id)],
                    },
                },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true, eventType: true },
            });
            const lastAt = lastTimeline?.createdAt ?? lastWs?.updatedAt ?? null;
            const daysSince = lastAt
                ? Math.floor((Date.now() - lastAt.getTime()) / 86_400_000)
                : UNKNOWN_DAYS_SINCE_ACTIVITY;
            const revenue = Number(ledger._sum.freightiqMarginUsd ?? 0);
            results.push({
                organisationId: orgId,
                organisationName: org.name,
                buyerUserIds: userIds,
                rfqCount: rfqs.length,
                orderCount: orders.length,
                shipmentCount: shipments.length,
                freightVolume: freightCount,
                revenueGeneratedUsd: revenue,
                commercialScore: commercialScore({ revenue, volume: freightCount, daysSince }),
                activity: activityFrom(lastAt, lastTimeline?.eventType),
                accountOwner: await this.accounts.mapOwner(orgId, org.name),
            });
        }
        return results.sort((a, b) => b.commercialScore - a.commercialScore);
    }
    async getBuyerHealth(organisationId) {
        const list = await this.listBuyerHealth();
        return list.find((b) => b.organisationId === organisationId) ?? null;
    }
    async listSupplierHealth() {
        const suppliers = await this.db.user.findMany({
            where: { role: "SUPPLIER", organisationId: { not: null } },
            include: { organisation: true },
        });
        const byOrg = new Map();
        for (const s of suppliers) {
            const oid = s.organisationId;
            const list = byOrg.get(oid) ?? [];
            list.push(s);
            byOrg.set(oid, list);
        }
        const results = [];
        for (const [orgId, users] of byOrg) {
            const org = users[0].organisation;
            const userIds = users.map((u) => u.id);
            const invitations = await this.db.supplierAssignment.count({
                where: { supplierUserId: { in: userIds } },
            });
            const orderParts = await this.db.workspaceParticipant.findMany({
                where: { userId: { in: userIds }, workspace: { type: "ORDER" } },
                include: { workspace: { select: { id: true, state: true, updatedAt: true, spawnedFromId: true } } },
            });
            const orderIds = [...new Set(orderParts.map((p) => p.workspaceId))];
            const shipments = await this.db.workspace.findMany({
                where: { type: "SHIPMENT", spawnedFromId: { in: orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"] } },
                select: { id: true, updatedAt: true },
            });
            const ledger = orderIds.length
                ? await this.db.freightRevenueLedger.aggregate({
                    where: { orderId: { in: orderIds }, status: "REALIZED" },
                    _sum: { freightiqMarginUsd: true },
                })
                : { _sum: { freightiqMarginUsd: null } };
            const lastTimeline = await this.db.timelineEvent.findFirst({
                where: { workspaceId: { in: [...orderIds, ...shipments.map((s) => s.id)] } },
                orderBy: { createdAt: "desc" },
            });
            const lastAt = lastTimeline?.createdAt ??
                orderParts.sort((a, b) => b.workspace.updatedAt.getTime() - a.workspace.updatedAt.getTime())[0]
                    ?.workspace.updatedAt ??
                null;
            const daysSince = lastAt
                ? Math.floor((Date.now() - lastAt.getTime()) / 86_400_000)
                : UNKNOWN_DAYS_SINCE_ACTIVITY;
            const revenue = Number(ledger._sum.freightiqMarginUsd ?? 0) * 0.5;
            results.push({
                organisationId: orgId,
                organisationName: org.name,
                supplierUserIds: userIds,
                rfqInvitations: invitations,
                orderCount: orderIds.length,
                shipmentCount: shipments.length,
                revenueAttributedUsd: revenue,
                commercialScore: commercialScore({ revenue, volume: orderIds.length, daysSince }),
                activity: activityFrom(lastAt, lastTimeline?.eventType),
                accountOwner: await this.accounts.mapOwner(orgId, org.name),
            });
        }
        return results.sort((a, b) => b.commercialScore - a.commercialScore);
    }
    async getSupplierHealth(organisationId) {
        const list = await this.listSupplierHealth();
        return list.find((s) => s.organisationId === organisationId) ?? null;
    }
}
//# sourceMappingURL=scale-portfolio.service.js.map