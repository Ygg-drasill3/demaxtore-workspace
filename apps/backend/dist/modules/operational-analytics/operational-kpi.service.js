import { cached } from "../../lib/response-cache.js";
import { Forbidden } from "../../lib/errors.js";
import { computeAnalyticsPermissions } from "./analytics-permissions.js";
import { toCsv, toXlsx } from "./analytics-export.js";
const SUMMARY_CACHE_TTL_MS = 5 * 60 * 1000;
const ACTIVE_SHIPMENT_STATES = new Set([
    "DRAFT",
    "BOOKED",
    "LOADED",
    "IN_TRANSIT",
    "ARRIVED",
    "CUSTOMS",
    "OUT_FOR_DELIVERY",
    "READY_FOR_DELIVERY",
]);
const PASS_DECISIONS = new Set(["PASS", "PASSED", "APPROVED"]);
const FAIL_DECISIONS = new Set(["FAIL", "FAILED", "REJECTED"]);
function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function hoursBetween(a, b) {
    return Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
}
function avg(nums) {
    if (!nums.length)
        return null;
    return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}
function pct(part, total) {
    if (total <= 0)
        return null;
    return Math.round((part / total) * 1000) / 10;
}
function deltaPct(current, previous) {
    if (previous == null || previous === 0)
        return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}
export function resolveAnalyticsRange(query, now = new Date()) {
    const preset = (query.preset ?? "LAST_30_DAYS");
    let from;
    let to = now;
    switch (preset) {
        case "TODAY":
            from = startOfDay(now);
            break;
        case "LAST_7_DAYS":
            from = new Date(now.getTime() - 7 * 86_400_000);
            break;
        case "THIS_MONTH":
            from = startOfMonth(now);
            break;
        case "CUSTOM":
            from = new Date(query.from);
            to = new Date(query.to);
            break;
        case "LAST_30_DAYS":
        default:
            from = new Date(now.getTime() - 30 * 86_400_000);
            break;
    }
    return { preset, from: from.toISOString(), to: to.toISOString() };
}
function previousRange(range) {
    const from = new Date(range.from);
    const to = new Date(range.to);
    const span = Math.max(1, to.getTime() - from.getTime());
    return { from: new Date(from.getTime() - span), to: from };
}
/**
 * SPR-30-07 — Read-only operational KPI aggregation.
 * Owns no entities; source modules remain authoritative.
 */
export class OperationalKPIService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    assertView(role) {
        const perms = computeAnalyticsPermissions(role);
        if (!perms.canView)
            throw Forbidden("Analytics dashboard requires ops viewer access");
        return perms;
    }
    assertSuppliers(role) {
        const perms = this.assertView(role);
        if (!perms.canViewSuppliers)
            throw Forbidden("Supplier KPIs require manager access");
        return perms;
    }
    assertExport(role) {
        const perms = this.assertView(role);
        if (!perms.canExport)
            throw Forbidden("Analytics export requires manager/admin access");
        return perms;
    }
    async summary(actor, query) {
        const perms = this.assertView(actor.role);
        const range = resolveAnalyticsRange(query);
        const cacheKey = `ops-analytics:summary:${actor.role}:${range.preset}:${range.from}:${range.to}`;
        const payload = await cached(cacheKey, SUMMARY_CACHE_TTL_MS, async () => {
            const [orders, shipments, inspections, tasks, issues, completion, trends] = await Promise.all([
                this.ordersKpis(range),
                this.shipmentsKpis(range),
                this.inspectionsKpis(range),
                this.tasksKpis(range),
                this.issuesKpis(range),
                this.completionKpis(range),
                this.trends(range),
            ]);
            return {
                range,
                generatedAt: new Date().toISOString(),
                orders,
                shipments,
                inspections,
                tasks,
                issues,
                completion,
                trends,
            };
        });
        return {
            ...payload,
            cached: true,
            permissions: perms,
        };
    }
    async orders(actor, query) {
        this.assertView(actor.role);
        const range = resolveAnalyticsRange(query);
        return { range, kpis: await this.ordersKpis(range) };
    }
    async shipments(actor, query) {
        this.assertView(actor.role);
        const range = resolveAnalyticsRange(query);
        return { range, kpis: await this.shipmentsKpis(range) };
    }
    async inspections(actor, query) {
        this.assertView(actor.role);
        const range = resolveAnalyticsRange(query);
        return { range, kpis: await this.inspectionsKpis(range) };
    }
    async tasks(actor, query) {
        this.assertView(actor.role);
        const range = resolveAnalyticsRange(query);
        return { range, kpis: await this.tasksKpis(range) };
    }
    async issues(actor, query) {
        this.assertView(actor.role);
        const range = resolveAnalyticsRange(query);
        return { range, kpis: await this.issuesKpis(range) };
    }
    async completion(actor, query) {
        this.assertView(actor.role);
        const range = resolveAnalyticsRange(query);
        return { range, kpis: await this.completionKpis(range) };
    }
    async suppliers(actor, query) {
        this.assertSuppliers(actor.role);
        const range = resolveAnalyticsRange(query);
        return { range, items: await this.supplierRows(range) };
    }
    async export(actor, query) {
        this.assertExport(actor.role);
        if (query.scope === "suppliers")
            this.assertSuppliers(actor.role);
        const range = resolveAnalyticsRange(query);
        const format = query.format ?? "csv";
        const scope = query.scope ?? "summary";
        const { headers, rows, sheet } = await this.exportTable(scope, range, actor.role);
        if (format === "xlsx") {
            return {
                filename: `operational-analytics-${scope}.xlsx`,
                contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                body: toXlsx(sheet, headers, rows),
            };
        }
        return {
            filename: `operational-analytics-${scope}.csv`,
            contentType: "text/csv; charset=utf-8",
            body: toCsv(headers, rows),
        };
    }
    // ── Domain aggregations ────────────────────────────────────────────────────
    async ordersKpis(range) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        const orders = await this.prisma.workspace.findMany({
            where: {
                type: "ORDER",
                trashedAt: null,
                createdAt: { gte: from, lte: to },
            },
            select: { id: true, state: true, createdAt: true },
            take: 5000,
        });
        const openOrders = orders.filter((o) => !["CLOSED", "CANCELLED", "REJECTED"].includes(o.state)).length;
        // Prefer operational completion timestamps when present
        const completions = await this.prisma.orderCompletion.findMany({
            where: {
                deletedAt: null,
                status: "COMPLETED",
                completedAt: { gte: from, lte: to },
            },
            select: { orderId: true, completedAt: true },
            take: 5000,
        });
        const createdMap = new Map((await this.prisma.workspace.findMany({
            where: { id: { in: completions.map((c) => c.orderId) } },
            select: { id: true, createdAt: true },
        })).map((w) => [w.id, w.createdAt]));
        const completionHours = completions
            .filter((c) => c.completedAt && createdMap.has(c.orderId))
            .map((c) => hoursBetween(createdMap.get(c.orderId), c.completedAt));
        const closedInRange = orders.filter((o) => ["CLOSED", "DELIVERED", "COMPLETED"].includes(o.state)).length;
        return {
            openOrders,
            completedOrders: Math.max(completions.length, closedInRange),
            averageCompletionHours: avg(completionHours),
        };
    }
    async shipmentsKpis(range) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        const shipments = await this.prisma.workspace.findMany({
            where: {
                type: "SHIPMENT",
                trashedAt: null,
                OR: [
                    { createdAt: { gte: from, lte: to } },
                    { updatedAt: { gte: from, lte: to } },
                ],
            },
            select: { id: true, state: true },
            take: 5000,
        });
        const activeShipments = shipments.filter((s) => ACTIVE_SHIPMENT_STATES.has(s.state)).length;
        const delayedMilestones = await this.prisma.shipmentMilestone.findMany({
            where: {
                deletedAt: null,
                delayMinutes: { gt: 0 },
                OR: [
                    { updatedAt: { gte: from, lte: to } },
                    { plannedAt: { gte: from, lte: to } },
                    { estimatedAt: { gte: from, lte: to } },
                ],
            },
            select: {
                shipmentWorkspaceId: true,
                delayMinutes: true,
                status: true,
                shipmentWorkspace: { select: { workspaceId: true } },
            },
            take: 5000,
        });
        const delayedIds = new Set(delayedMilestones.map((m) => m.shipmentWorkspace.workspaceId));
        const delayedShipments = delayedIds.size;
        const delayHours = delayedMilestones
            .filter((m) => (m.delayMinutes ?? 0) > 0)
            .map((m) => (m.delayMinutes ?? 0) / 60);
        const deliveries = await this.prisma.deliveryRecord.findMany({
            where: {
                deletedAt: null,
                deliveredAt: { gte: from, lte: to },
            },
            select: { shipmentId: true, deliveredAt: true },
            take: 5000,
        });
        let onTime = 0;
        let withPlan = 0;
        if (deliveries.length) {
            const shipmentWorkspaceIds = deliveries.map((d) => d.shipmentId).filter(Boolean);
            const swRows = await this.prisma.shipmentWorkspace.findMany({
                where: { workspaceId: { in: shipmentWorkspaceIds } },
                select: { id: true, workspaceId: true, eta: true },
            });
            const swByWorkspace = new Map(swRows.map((s) => [s.workspaceId, s]));
            const deliveryMs = await this.prisma.shipmentMilestone.findMany({
                where: {
                    shipmentWorkspaceId: { in: swRows.map((s) => s.id) },
                    type: "DELIVERY",
                    deletedAt: null,
                },
                select: {
                    shipmentWorkspaceId: true,
                    plannedAt: true,
                    estimatedAt: true,
                },
            });
            const planBySw = new Map(deliveryMs.map((m) => [m.shipmentWorkspaceId, m.estimatedAt ?? m.plannedAt]));
            for (const d of deliveries) {
                if (!d.shipmentId)
                    continue;
                const sw = swByWorkspace.get(d.shipmentId);
                if (!sw)
                    continue;
                const plan = planBySw.get(sw.id) ?? sw.eta;
                if (!plan)
                    continue;
                withPlan += 1;
                if (d.deliveredAt.getTime() <= plan.getTime())
                    onTime += 1;
            }
        }
        return {
            activeShipments,
            delayedShipments,
            onTimeDeliveryPct: pct(onTime, withPlan),
            averageDelayHours: avg(delayHours),
        };
    }
    async inspectionsKpis(range) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        const rows = await this.prisma.inspectionWorkspace.findMany({
            where: {
                OR: [
                    { requestedAt: { gte: from, lte: to } },
                    { createdAt: { gte: from, lte: to } },
                    { decisionAt: { gte: from, lte: to } },
                ],
            },
            select: { decision: true, status: true, requestedAt: true },
            take: 5000,
        });
        const requested = rows.length;
        const passed = rows.filter((r) => (r.decision && PASS_DECISIONS.has(r.decision.toUpperCase()))
            || r.status === "APPROVED").length;
        const failed = rows.filter((r) => (r.decision && FAIL_DECISIONS.has(r.decision.toUpperCase()))
            || r.status === "FAILED").length;
        const decided = passed + failed;
        return {
            requested,
            passed,
            failed,
            passRatePct: pct(passed, decided),
        };
    }
    async tasksKpis(range) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        const now = new Date();
        const todayStart = startOfDay(now);
        const [open, overdue, completedToday, resolved] = await Promise.all([
            this.prisma.operationalTask.count({
                where: {
                    deletedAt: null,
                    status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
                    createdAt: { lte: to },
                },
            }),
            this.prisma.operationalTask.count({
                where: {
                    deletedAt: null,
                    status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
                    dueDate: { lt: now },
                },
            }),
            this.prisma.operationalTask.count({
                where: {
                    deletedAt: null,
                    status: "COMPLETED",
                    completedAt: { gte: todayStart, lte: now },
                },
            }),
            this.prisma.operationalTask.findMany({
                where: {
                    deletedAt: null,
                    status: "COMPLETED",
                    completedAt: { gte: from, lte: to },
                },
                select: { createdAt: true, completedAt: true },
                take: 5000,
            }),
        ]);
        const resolutionHours = resolved
            .filter((t) => t.completedAt)
            .map((t) => hoursBetween(t.createdAt, t.completedAt));
        return {
            open,
            overdue,
            completedToday,
            averageResolutionHours: avg(resolutionHours),
        };
    }
    async issuesKpis(range) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        const now = new Date();
        const todayStart = startOfDay(now);
        const [open, critical, resolvedToday, resolved] = await Promise.all([
            this.prisma.operationalIssue.count({
                where: {
                    deletedAt: null,
                    status: { in: ["OPEN", "IN_PROGRESS"] },
                },
            }),
            this.prisma.operationalIssue.count({
                where: {
                    deletedAt: null,
                    status: { in: ["OPEN", "IN_PROGRESS"] },
                    severity: "CRITICAL",
                },
            }),
            this.prisma.operationalIssue.count({
                where: {
                    deletedAt: null,
                    status: { in: ["RESOLVED", "CLOSED"] },
                    resolvedAt: { gte: todayStart, lte: now },
                },
            }),
            this.prisma.operationalIssue.findMany({
                where: {
                    deletedAt: null,
                    resolvedAt: { gte: from, lte: to },
                },
                select: { createdAt: true, resolvedAt: true },
                take: 5000,
            }),
        ]);
        const resolutionHours = resolved
            .filter((i) => i.resolvedAt)
            .map((i) => hoursBetween(i.createdAt, i.resolvedAt));
        return {
            open,
            critical,
            resolvedToday,
            averageResolutionHours: avg(resolutionHours),
        };
    }
    async completionKpis(range) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        const todayStart = startOfDay(new Date());
        const [ready, completedToday, completedInRange, totalTracked] = await Promise.all([
            this.prisma.orderCompletion.count({
                where: { deletedAt: null, status: "READY" },
            }),
            this.prisma.orderCompletion.count({
                where: {
                    deletedAt: null,
                    status: "COMPLETED",
                    completedAt: { gte: todayStart },
                },
            }),
            this.prisma.orderCompletion.count({
                where: {
                    deletedAt: null,
                    status: "COMPLETED",
                    completedAt: { gte: from, lte: to },
                },
            }),
            this.prisma.orderCompletion.count({
                where: {
                    deletedAt: null,
                    createdAt: { gte: from, lte: to },
                },
            }),
        ]);
        return {
            ready,
            completedToday,
            completionRatePct: pct(completedInRange, Math.max(totalTracked, completedInRange)),
        };
    }
    async trends(range) {
        const prev = previousRange(range);
        const prevDto = {
            preset: "CUSTOM",
            from: prev.from.toISOString(),
            to: prev.to.toISOString(),
        };
        const [curOrders, prevOrders, curShip, prevShip, curTasks, prevTasks, curIssues, prevIssues] = await Promise.all([
            this.ordersKpis(range),
            this.ordersKpis(prevDto),
            this.shipmentsKpis(range),
            this.shipmentsKpis(prevDto),
            this.tasksKpis(range),
            this.tasksKpis(prevDto),
            this.issuesKpis(range),
            this.issuesKpis(prevDto),
        ]);
        const mk = (key, label, value, previousValue) => ({
            key,
            label,
            value,
            previousValue,
            deltaPct: deltaPct(value, previousValue),
        });
        return [
            mk("open_orders", "Open orders", curOrders.openOrders, prevOrders.openOrders),
            mk("delayed_shipments", "Delayed shipments", curShip.delayedShipments, prevShip.delayedShipments),
            mk("open_tasks", "Open tasks", curTasks.open, prevTasks.open),
            mk("open_issues", "Open issues", curIssues.open, prevIssues.open),
        ];
    }
    async supplierRows(range) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        const orderDetails = await this.prisma.orderWorkspace.findMany({
            where: {
                workspace: {
                    trashedAt: null,
                    createdAt: { gte: from, lte: to },
                },
            },
            select: {
                workspaceId: true,
                supplierUserId: true,
                inspectionResult: true,
                inspectionCompletedAt: true,
                deliveredAt: true,
                closedAt: true,
                createdAt: true,
                workspace: { select: { state: true, createdAt: true } },
            },
            take: 5000,
        });
        if (!orderDetails.length)
            return [];
        const supplierIds = [...new Set(orderDetails.map((o) => o.supplierUserId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, displayName: true, email: true },
        });
        const nameById = new Map(users.map((u) => [u.id, u.displayName || u.email || u.id]));
        const orderIds = orderDetails.map((o) => o.workspaceId);
        const [completions, shipments, delayedMs] = await Promise.all([
            this.prisma.orderCompletion.findMany({
                where: { orderId: { in: orderIds }, deletedAt: null },
                select: { orderId: true, status: true, completedAt: true },
            }),
            this.prisma.workspace.findMany({
                where: {
                    type: "SHIPMENT",
                    spawnedFromId: { in: orderIds },
                    trashedAt: null,
                },
                select: { id: true, spawnedFromId: true, state: true },
            }),
            this.prisma.shipmentMilestone.findMany({
                where: { deletedAt: null, delayMinutes: { gt: 0 } },
                select: {
                    shipmentWorkspace: { select: { workspaceId: true } },
                },
                take: 5000,
            }),
        ]);
        const completionByOrder = new Map(completions.map((c) => [c.orderId, c]));
        const delayedShipIds = new Set(delayedMs.map((m) => m.shipmentWorkspace.workspaceId));
        const shipsByOrder = new Map();
        for (const s of shipments) {
            if (!s.spawnedFromId)
                continue;
            const list = shipsByOrder.get(s.spawnedFromId) ?? [];
            list.push({ id: s.id, state: s.state });
            shipsByOrder.set(s.spawnedFromId, list);
        }
        const bySupplier = new Map();
        for (const o of orderDetails) {
            const acc = bySupplier.get(o.supplierUserId) ?? {
                openOrders: 0,
                completedOrders: 0,
                inspPass: 0,
                inspTotal: 0,
                delayHits: 0,
                shipTotal: 0,
                leadDays: [],
                completionHours: [],
            };
            const state = o.workspace.state;
            if (!["CLOSED", "CANCELLED", "REJECTED"].includes(state))
                acc.openOrders += 1;
            const completion = completionByOrder.get(o.workspaceId);
            if (completion?.status === "COMPLETED" || state === "CLOSED") {
                acc.completedOrders += 1;
                const end = completion?.completedAt ?? o.closedAt ?? o.deliveredAt;
                if (end)
                    acc.completionHours.push(hoursBetween(o.workspace.createdAt, end));
            }
            if (o.inspectionResult) {
                acc.inspTotal += 1;
                if (PASS_DECISIONS.has(o.inspectionResult.toUpperCase()))
                    acc.inspPass += 1;
            }
            const ships = shipsByOrder.get(o.workspaceId) ?? [];
            for (const s of ships) {
                acc.shipTotal += 1;
                if (delayedShipIds.has(s.id))
                    acc.delayHits += 1;
            }
            const endLead = o.deliveredAt ?? o.closedAt ?? completion?.completedAt ?? null;
            if (endLead) {
                acc.leadDays.push(hoursBetween(o.workspace.createdAt, endLead) / 24);
            }
            bySupplier.set(o.supplierUserId, acc);
        }
        return [...bySupplier.entries()]
            .map(([supplierUserId, acc]) => ({
            supplierUserId,
            supplierName: nameById.get(supplierUserId) ?? supplierUserId,
            openOrders: acc.openOrders,
            completedOrders: acc.completedOrders,
            inspectionPassPct: pct(acc.inspPass, acc.inspTotal),
            shipmentDelayPct: pct(acc.delayHits, acc.shipTotal),
            averageLeadTimeDays: avg(acc.leadDays),
            averageCompletionHours: avg(acc.completionHours),
        }))
            .sort((a, b) => b.completedOrders - a.completedOrders || b.openOrders - a.openOrders)
            .slice(0, 100);
    }
    async exportTable(scope, range, role) {
        switch (scope) {
            case "orders": {
                const k = await this.ordersKpis(range);
                return {
                    sheet: "Orders",
                    headers: ["metric", "value", "from", "to"],
                    rows: [
                        ["openOrders", k.openOrders, range.from, range.to],
                        ["completedOrders", k.completedOrders, range.from, range.to],
                        ["averageCompletionHours", k.averageCompletionHours, range.from, range.to],
                    ],
                };
            }
            case "shipments": {
                const k = await this.shipmentsKpis(range);
                return {
                    sheet: "Shipments",
                    headers: ["metric", "value", "from", "to"],
                    rows: Object.entries(k).map(([metric, value]) => [metric, value, range.from, range.to]),
                };
            }
            case "inspections": {
                const k = await this.inspectionsKpis(range);
                return {
                    sheet: "Inspections",
                    headers: ["metric", "value", "from", "to"],
                    rows: Object.entries(k).map(([metric, value]) => [metric, value, range.from, range.to]),
                };
            }
            case "tasks": {
                const k = await this.tasksKpis(range);
                return {
                    sheet: "Tasks",
                    headers: ["metric", "value", "from", "to"],
                    rows: Object.entries(k).map(([metric, value]) => [metric, value, range.from, range.to]),
                };
            }
            case "issues": {
                const k = await this.issuesKpis(range);
                return {
                    sheet: "Issues",
                    headers: ["metric", "value", "from", "to"],
                    rows: Object.entries(k).map(([metric, value]) => [metric, value, range.from, range.to]),
                };
            }
            case "completion": {
                const k = await this.completionKpis(range);
                return {
                    sheet: "Completion",
                    headers: ["metric", "value", "from", "to"],
                    rows: Object.entries(k).map(([metric, value]) => [metric, value, range.from, range.to]),
                };
            }
            case "suppliers": {
                if (!computeAnalyticsPermissions(role).canViewSuppliers) {
                    throw Forbidden("Supplier KPIs require manager access");
                }
                const items = await this.supplierRows(range);
                return {
                    sheet: "Suppliers",
                    headers: [
                        "supplierUserId",
                        "supplierName",
                        "openOrders",
                        "completedOrders",
                        "inspectionPassPct",
                        "shipmentDelayPct",
                        "averageLeadTimeDays",
                        "averageCompletionHours",
                    ],
                    rows: items.map((r) => [
                        r.supplierUserId,
                        r.supplierName,
                        r.openOrders,
                        r.completedOrders,
                        r.inspectionPassPct,
                        r.shipmentDelayPct,
                        r.averageLeadTimeDays,
                        r.averageCompletionHours,
                    ]),
                };
            }
            case "summary":
            default: {
                const [o, s, i, t, iss, c] = await Promise.all([
                    this.ordersKpis(range),
                    this.shipmentsKpis(range),
                    this.inspectionsKpis(range),
                    this.tasksKpis(range),
                    this.issuesKpis(range),
                    this.completionKpis(range),
                ]);
                const flat = {
                    openOrders: o.openOrders,
                    completedOrders: o.completedOrders,
                    averageCompletionHours: o.averageCompletionHours,
                    activeShipments: s.activeShipments,
                    delayedShipments: s.delayedShipments,
                    onTimeDeliveryPct: s.onTimeDeliveryPct,
                    averageDelayHours: s.averageDelayHours,
                    inspectionRequested: i.requested,
                    inspectionPassed: i.passed,
                    inspectionFailed: i.failed,
                    inspectionPassRatePct: i.passRatePct,
                    tasksOpen: t.open,
                    tasksOverdue: t.overdue,
                    tasksCompletedToday: t.completedToday,
                    tasksAvgResolutionHours: t.averageResolutionHours,
                    issuesOpen: iss.open,
                    issuesCritical: iss.critical,
                    issuesResolvedToday: iss.resolvedToday,
                    issuesAvgResolutionHours: iss.averageResolutionHours,
                    completionReady: c.ready,
                    completionCompletedToday: c.completedToday,
                    completionRatePct: c.completionRatePct,
                };
                return {
                    sheet: "Summary",
                    headers: ["metric", "value", "from", "to", "preset"],
                    rows: Object.entries(flat).map(([metric, value]) => [
                        metric,
                        value,
                        range.from,
                        range.to,
                        range.preset,
                    ]),
                };
            }
        }
    }
}
//# sourceMappingURL=operational-kpi.service.js.map