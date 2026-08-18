import { AlertKey } from "@dmx/contracts/control-tower";
const STALE_MS = 7 * 86_400_000;
const RFQ_TERMINAL = new Set(["CANCELLED", "EXPIRED", "CLOSED_NO_AWARD", "PO_ISSUED", "CLOSED"]);
const ORDER_TERMINAL = new Set(["COMPLETED", "CANCELLED", "DISPUTED", "REJECTED", "CLOSED"]);
const SHIPMENT_TERMINAL = new Set(["DELIVERED", "CANCELLED"]);
export class ScalePipelineService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getPipelineHealth() {
        const now = Date.now();
        const workspaces = await this.db.workspace.findMany({
            where: {
                OR: [
                    { type: "RFQ", state: { notIn: [...RFQ_TERMINAL] } },
                    { type: "ORDER", state: { notIn: [...ORDER_TERMINAL] } },
                    { type: "SHIPMENT", state: { notIn: [...SHIPMENT_TERMINAL] } },
                ],
            },
            select: { id: true, type: true, state: true, externalRef: true, updatedAt: true },
            take: 500,
            orderBy: { updatedAt: "asc" },
        });
        const openAlerts = await this.db.controlTowerAlert.findMany({
            where: { resolvedAt: null, workspaceId: { not: null } },
            select: { workspaceId: true, alertKey: true },
        });
        const alertsByWs = new Map();
        for (const a of openAlerts) {
            if (!a.workspaceId)
                continue;
            const list = alertsByWs.get(a.workspaceId) ?? [];
            list.push(a.alertKey);
            alertsByWs.set(a.workspaceId, list);
        }
        const items = [];
        for (const ws of workspaces) {
            const issues = [];
            let score = 100;
            const stale = now - ws.updatedAt.getTime() > STALE_MS;
            if (stale) {
                score -= 30;
                issues.push("stale_activity");
            }
            const alerts = alertsByWs.get(ws.id) ?? [];
            if (alerts.length) {
                score -= Math.min(40, alerts.length * 10);
                issues.push("open_alerts");
            }
            if (ws.type === "RFQ") {
                if (ws.state === "RFQ_SUBMITTED") {
                    const assigned = await this.db.supplierAssignment.count({ where: { workspaceId: ws.id } });
                    if (!assigned) {
                        score -= 25;
                        issues.push("rfq_stalled");
                    }
                }
                if (ws.state === "RFQ_OPEN" || ws.state === "PROFORMA_REQUESTED") {
                    issues.push("rfq_in_progress");
                }
            }
            if (ws.type === "ORDER") {
                if (ws.state === "ORDER_CREATED" || ws.state === "AWAITING_SUPPLIER_CONFIRMATION") {
                    score -= 15;
                    issues.push("po_waiting");
                }
                if (ws.state === "IN_PRODUCTION" && stale) {
                    issues.push("production_stalled");
                }
            }
            if (ws.type === "SHIPMENT") {
                if (alerts.includes(AlertKey.SHIPMENT_ETA_EXCEEDED) || alerts.includes(AlertKey.TRACKING_DELAY_DETECTED)) {
                    score -= 25;
                    issues.push("shipment_delayed");
                }
            }
            if (alerts.some((k) => k.startsWith("trade_doc"))) {
                score -= 20;
                issues.push("documentation_blocked");
            }
            const healthScore = Math.max(0, Math.min(100, score));
            const stalled = healthScore < 50 || issues.includes("rfq_stalled") || issues.includes("documentation_blocked");
            items.push({
                workspaceId: ws.id,
                workspaceType: ws.type,
                workspaceRef: ws.externalRef,
                state: ws.state,
                healthScore,
                issues,
                stalled,
            });
        }
        const avg = items.length ? items.reduce((s, i) => s + i.healthScore, 0) / items.length : 100;
        await this.auditHealthRefresh(items.length);
        return {
            items: items.sort((a, b) => a.healthScore - b.healthScore),
            averageHealthScore: Math.round(avg),
            stalledCount: items.filter((i) => i.stalled).length,
        };
    }
    async auditHealthRefresh(count) {
        const anchor = await this.db.workspace.findFirst({
            where: { type: "ORDER" },
            orderBy: { createdAt: "asc" },
            select: { id: true, state: true },
        });
        if (!anchor)
            return;
        await this.db.auditLog.create({
            data: {
                workspaceId: anchor.id,
                actorUserId: "00000000-0000-0000-0000-000000000001",
                actorEmail: "system@demaxtore.local",
                actorRole: "SYSTEM",
                action: "health.score.updated",
                fromState: anchor.state,
                toState: anchor.state,
                payload: { workspaceCount: count },
            },
        }).catch(() => undefined);
    }
}
//# sourceMappingURL=scale-pipeline.service.js.map