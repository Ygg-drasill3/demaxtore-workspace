import { computeMilestoneDelayMinutes, computeMilestoneRisk, DEFAULT_SHIPMENT_MILESTONE_PLAN, effectiveMilestoneAt, SHIPMENT_MILESTONE_TYPE_LABELS, } from "@dmx/contracts/shipment-milestones";
import { AppError } from "../../utils/httpErrors.js";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import { computeShipmentPermissions } from "./shipment-workspace.ops.js";
const RISK_ORDER = {
    ON_TRACK: 0,
    AT_RISK: 1,
    DELAYED: 2,
};
function iso(d) {
    return d ? d.toISOString() : null;
}
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
export class ShipmentMilestoneService {
    db;
    constructor(db) {
        this.db = db;
    }
    permissions(role) {
        const perms = computeShipmentPermissions(role);
        return {
            canView: perms.canView,
            canUpdate: perms.canUpdateMilestones,
            canManage: perms.canManageMilestones,
            canComplete: perms.canUpdateMilestones,
        };
    }
    map(row, shipmentId, role) {
        const delayMinutes = computeMilestoneDelayMinutes({
            plannedAt: row.plannedAt,
            estimatedAt: row.estimatedAt,
            actualAt: row.actualAt,
        });
        const plannedAt = iso(row.plannedAt);
        const actualAt = iso(row.actualAt);
        const type = row.type;
        return {
            id: row.id,
            shipmentId,
            type,
            label: SHIPMENT_MILESTONE_TYPE_LABELS[type] ?? row.type,
            plannedAt,
            estimatedAt: iso(row.estimatedAt),
            actualAt,
            effectiveAt: effectiveMilestoneAt({
                plannedAt,
                estimatedAt: iso(row.estimatedAt),
                actualAt,
            }),
            status: row.status,
            delayMinutes,
            risk: computeMilestoneRisk(delayMinutes),
            sequence: row.sequence,
            permissions: this.permissions(role),
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            key: type,
            planned: plannedAt,
            actual: actualAt,
        };
    }
    summarize(items, shipmentEta) {
        const planned = items.filter((m) => m.status !== "SKIPPED");
        const current = planned.find((m) => m.status !== "COMPLETED") ?? null;
        const worst = planned.reduce((acc, m) => (RISK_ORDER[m.risk] > RISK_ORDER[acc] ? m.risk : acc), "ON_TRACK");
        const delays = planned
            .map((m) => m.delayMinutes)
            .filter((d) => d != null && d > 0);
        const finalMilestone = planned.find((m) => m.type === "DELIVERY") ?? planned.find((m) => m.type === "ARRIVAL");
        return {
            current,
            progressCompleted: planned.filter((m) => m.status === "COMPLETED").length,
            progressTotal: planned.length,
            overallRisk: worst,
            overallDelayMinutes: delays.length ? Math.max(...delays) : null,
            eta: finalMilestone?.effectiveAt ?? iso(shipmentEta),
        };
    }
    async loadShipment(workspaceId, actor) {
        const sw = await this.db.shipmentWorkspace.findUnique({ where: { workspaceId } });
        if (!sw)
            throw new AppError(404, "SHIPMENT_NOT_FOUND");
        if (!hasPortfolioVisibility(actor.role) && actor.role !== "ADMIN") {
            const participant = await this.db.workspaceParticipant.findFirst({
                where: { workspaceId, userId: actor.id, leftAt: null },
            });
            if (!participant)
                throw new AppError(403, "FORBIDDEN");
        }
        return sw;
    }
    /**
     * Materialise the default plan the first time a shipment's milestones are read.
     * Nothing else creates these rows, so without this the tab stays permanently empty.
     * Idempotent via the (shipmentWorkspaceId, type) unique constraint.
     */
    async ensurePlan(shipmentWorkspaceId) {
        const existing = await this.db.shipmentMilestone.count({
            where: { shipmentWorkspaceId, deletedAt: null },
        });
        if (existing > 0)
            return;
        await this.db.shipmentMilestone.createMany({
            data: DEFAULT_SHIPMENT_MILESTONE_PLAN.map((step) => ({
                shipmentWorkspaceId,
                type: step.type,
                sequence: step.sequence,
                status: step.skipByDefault ? "SKIPPED" : "PENDING",
            })),
            skipDuplicates: true,
        });
    }
    async rows(shipmentWorkspaceId) {
        return this.db.shipmentMilestone.findMany({
            where: { shipmentWorkspaceId, deletedAt: null },
            orderBy: { sequence: "asc" },
        });
    }
    async respond(workspaceId, shipmentWorkspaceId, eta, role) {
        const items = (await this.rows(shipmentWorkspaceId)).map((r) => this.map(r, workspaceId, role));
        return { shipmentId: workspaceId, items, summary: this.summarize(items, eta) };
    }
    async list(actor, workspaceId) {
        const sw = await this.loadShipment(workspaceId, actor);
        await this.ensurePlan(sw.id);
        return this.respond(workspaceId, sw.id, sw.eta, actor.role);
    }
    async create(actor, workspaceId, input) {
        const sw = await this.loadShipment(workspaceId, actor);
        if (!this.permissions(actor.role).canManage)
            throw new AppError(403, "FORBIDDEN");
        const duplicate = await this.db.shipmentMilestone.findFirst({
            where: { shipmentWorkspaceId: sw.id, type: input.type, deletedAt: null },
        });
        if (duplicate)
            throw new AppError(409, "MILESTONE_ALREADY_EXISTS");
        const fallbackSequence = DEFAULT_SHIPMENT_MILESTONE_PLAN.find((s) => s.type === input.type)?.sequence ?? 0;
        const row = await this.db.shipmentMilestone.create({
            data: {
                shipmentWorkspaceId: sw.id,
                type: input.type,
                plannedAt: input.plannedAt ? new Date(input.plannedAt) : null,
                estimatedAt: input.estimatedAt ? new Date(input.estimatedAt) : null,
                actualAt: input.actualAt ? new Date(input.actualAt) : null,
                status: input.status ?? "PENDING",
                sequence: input.sequence ?? fallbackSequence,
                createdById: actor.id,
                updatedById: actor.id,
            },
        });
        return this.map(row, workspaceId, actor.role);
    }
    async loadMilestone(shipmentWorkspaceId, milestoneId) {
        const row = await this.db.shipmentMilestone.findFirst({
            where: { id: milestoneId, shipmentWorkspaceId, deletedAt: null },
        });
        if (!row)
            throw new AppError(404, "MILESTONE_NOT_FOUND");
        return row;
    }
    async patch(actor, workspaceId, milestoneId, input) {
        const sw = await this.loadShipment(workspaceId, actor);
        if (!this.permissions(actor.role).canUpdate)
            throw new AppError(403, "FORBIDDEN");
        const existing = await this.loadMilestone(sw.id, milestoneId);
        const plannedAt = input.plannedAt !== undefined
            ? input.plannedAt ? new Date(input.plannedAt) : null
            : existing.plannedAt;
        const estimatedAt = input.estimatedAt !== undefined
            ? input.estimatedAt ? new Date(input.estimatedAt) : null
            : existing.estimatedAt;
        const actualAt = input.actualAt !== undefined
            ? input.actualAt ? new Date(input.actualAt) : null
            : existing.actualAt;
        const row = await this.db.shipmentMilestone.update({
            where: { id: milestoneId },
            data: {
                plannedAt,
                estimatedAt,
                actualAt,
                // An actual timestamp is what "done" means, so keep status consistent with it.
                status: input.status ?? (actualAt ? "COMPLETED" : existing.status),
                sequence: input.sequence ?? existing.sequence,
                delayMinutes: computeMilestoneDelayMinutes({ plannedAt, estimatedAt, actualAt }),
                updatedById: actor.id,
            },
        });
        return this.map(row, workspaceId, actor.role);
    }
    async complete(actor, workspaceId, milestoneId, input) {
        const sw = await this.loadShipment(workspaceId, actor);
        if (!this.permissions(actor.role).canComplete)
            throw new AppError(403, "FORBIDDEN");
        const existing = await this.loadMilestone(sw.id, milestoneId);
        const actualAt = input.actualAt ? new Date(input.actualAt) : new Date();
        await this.db.shipmentMilestone.update({
            where: { id: milestoneId },
            data: {
                actualAt,
                status: "COMPLETED",
                delayMinutes: computeMilestoneDelayMinutes({
                    plannedAt: existing.plannedAt,
                    estimatedAt: existing.estimatedAt,
                    actualAt,
                }),
                updatedById: actor.id,
            },
        });
        const next = await this.db.shipmentMilestone.findFirst({
            where: {
                shipmentWorkspaceId: sw.id,
                deletedAt: null,
                status: "PENDING",
                sequence: { gt: existing.sequence },
            },
            orderBy: { sequence: "asc" },
        });
        if (next) {
            await this.db.shipmentMilestone.update({
                where: { id: next.id },
                data: { status: "ACTIVE", updatedById: actor.id },
            });
        }
        return this.respond(workspaceId, sw.id, sw.eta, actor.role);
    }
    /** Shipment workspace ids the actor may see, or null for unrestricted. */
    async accessibleShipmentIds(actor) {
        if (actor.role === "ADMIN" || hasPortfolioVisibility(actor.role))
            return null;
        const parts = await this.db.workspaceParticipant.findMany({
            where: { userId: actor.id, leftAt: null, workspace: { type: "SHIPMENT" } },
            select: { workspaceId: true },
            take: 1000,
        });
        return parts.map((p) => p.workspaceId);
    }
    async scopedShipments(actor) {
        const ids = await this.accessibleShipmentIds(actor);
        if (ids && ids.length === 0)
            return [];
        return this.db.shipmentWorkspace.findMany({
            where: ids ? { workspaceId: { in: ids } } : {},
            select: {
                id: true,
                workspaceId: true,
                orderRef: true,
                destinationPort: true,
                eta: true,
            },
            take: 500,
        });
    }
    async delayed(actor, query) {
        const shipments = await this.scopedShipments(actor);
        if (shipments.length === 0) {
            return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
        }
        const rows = await this.db.shipmentMilestone.findMany({
            where: {
                shipmentWorkspaceId: { in: shipments.map((s) => s.id) },
                deletedAt: null,
                status: { notIn: ["COMPLETED", "SKIPPED"] },
            },
            orderBy: { sequence: "asc" },
        });
        const byShipment = new Map();
        for (const r of rows) {
            const list = byShipment.get(r.shipmentWorkspaceId) ?? [];
            list.push(r);
            byShipment.set(r.shipmentWorkspaceId, list);
        }
        const items = [];
        for (const sw of shipments) {
            const milestones = byShipment.get(sw.id) ?? [];
            let worstDelay = 0;
            let worstRow = null;
            for (const m of milestones) {
                const delay = computeMilestoneDelayMinutes({
                    plannedAt: m.plannedAt,
                    estimatedAt: m.estimatedAt,
                    actualAt: m.actualAt,
                });
                if (delay != null && delay > worstDelay) {
                    worstDelay = delay;
                    worstRow = m;
                }
            }
            if (!worstRow || worstDelay < query.minDelayMinutes)
                continue;
            items.push({
                shipmentId: sw.workspaceId,
                orderRef: sw.orderRef,
                destination: sw.destinationPort,
                currentMilestone: SHIPMENT_MILESTONE_TYPE_LABELS[worstRow.type] ?? worstRow.type,
                delayMinutes: worstDelay,
                risk: computeMilestoneRisk(worstDelay),
                eta: iso(sw.eta),
            });
        }
        items.sort((a, b) => b.delayMinutes - a.delayMinutes);
        const start = (query.page - 1) * query.pageSize;
        return {
            items: items.slice(start, start + query.pageSize),
            total: items.length,
            page: query.page,
            pageSize: query.pageSize,
        };
    }
    async upcoming(actor, query) {
        const shipments = await this.scopedShipments(actor);
        if (shipments.length === 0) {
            return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
        }
        const byId = new Map(shipments.map((s) => [s.id, s]));
        const horizon = new Date(Date.now() + query.withinHours * 3_600_000);
        const rows = await this.db.shipmentMilestone.findMany({
            where: {
                shipmentWorkspaceId: { in: shipments.map((s) => s.id) },
                deletedAt: null,
                status: { in: ["PENDING", "ACTIVE"] },
            },
            orderBy: { sequence: "asc" },
        });
        const items = [];
        for (const r of rows) {
            const sw = byId.get(r.shipmentWorkspaceId);
            if (!sw)
                continue;
            const effectiveAt = effectiveMilestoneAt({
                plannedAt: iso(r.plannedAt),
                estimatedAt: iso(r.estimatedAt),
                actualAt: iso(r.actualAt),
            });
            if (!effectiveAt)
                continue;
            const at = new Date(effectiveAt);
            if (at > horizon)
                continue;
            const type = r.type;
            items.push({
                shipmentId: sw.workspaceId,
                orderRef: sw.orderRef,
                milestoneId: r.id,
                type,
                label: SHIPMENT_MILESTONE_TYPE_LABELS[type] ?? r.type,
                effectiveAt,
                risk: computeMilestoneRisk(computeMilestoneDelayMinutes({
                    plannedAt: r.plannedAt,
                    estimatedAt: r.estimatedAt,
                    actualAt: r.actualAt,
                })),
            });
        }
        items.sort((a, b) => new Date(a.effectiveAt).getTime() - new Date(b.effectiveAt).getTime());
        const start = (query.page - 1) * query.pageSize;
        return {
            items: items.slice(start, start + query.pageSize),
            total: items.length,
            page: query.page,
            pageSize: query.pageSize,
        };
    }
    async dashboardSummary(actor) {
        const [upcoming, delayed] = await Promise.all([
            this.upcoming(actor, { page: 1, pageSize: 100, withinHours: 72 }),
            this.delayed(actor, { page: 1, pageSize: 100, minDelayMinutes: 1 }),
        ]);
        const dayStart = startOfToday();
        const dayEnd = new Date(dayStart.getTime() + 86_400_000);
        const inToday = (at) => {
            const t = new Date(at).getTime();
            return t >= dayStart.getTime() && t < dayEnd.getTime();
        };
        return {
            upcoming: upcoming.total,
            delayed: delayed.total,
            departuresToday: upcoming.items.filter((m) => m.type === "DEPARTURE" && inToday(m.effectiveAt))
                .length,
            deliveriesToday: upcoming.items.filter((m) => m.type === "DELIVERY" && inToday(m.effectiveAt))
                .length,
            highRisk: delayed.items.filter((d) => d.risk === "DELAYED").length,
        };
    }
}
//# sourceMappingURL=shipment-milestone.service.js.map