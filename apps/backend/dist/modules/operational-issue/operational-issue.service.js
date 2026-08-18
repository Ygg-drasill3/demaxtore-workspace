import { Prisma } from "@prisma/client";
import { OPERATIONAL_ISSUE_AUTOMATION_KEYS, } from "@dmx/contracts/operational-issue";
import { AppError } from "../../utils/httpErrors.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
import { canAccessOrder } from "../order/order.policy.js";
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000001";
function startOfTodayUtc() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
function endOfTodayUtc() {
    const d = startOfTodayUtc();
    d.setUTCDate(d.getUTCDate() + 1);
    return d;
}
export function computeIssuePermissions(role) {
    const manager = isPlatformAdminRole(role)
        || role === "OPS_MANAGER"
        || role === "ADMIN"
        || role === "DOCUMENT_CONTROLLER"
        || role === "SALES_CONTROL";
    const ops = manager || role === "LOGISTICS_OPERATOR" || role === "BUYER";
    return {
        canView: true,
        canCreate: ops,
        canUpdate: ops,
        canResolve: ops,
        canClose: manager,
        canReopen: manager || ops,
    };
}
export class OperationalIssueService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertOrderAccess(actor, orderId) {
        // Checked before the role bypass below, otherwise a privileged actor asking for an
        // order that does not exist got an empty list instead of a 404.
        const order = await this.prisma.workspace.findFirst({
            where: { id: orderId, type: "ORDER" },
            select: { id: true },
        });
        if (!order)
            throw new AppError(404, "ORDER_NOT_FOUND");
        if (isPlatformAdminRole(actor.role)
            || actor.role === "OPS_MANAGER"
            || actor.role === "LOGISTICS_OPERATOR"
            || actor.role === "DOCUMENT_CONTROLLER"
            || actor.role === "SALES_CONTROL") {
            return;
        }
        const ok = await canAccessOrder(this.prisma, actor, orderId);
        if (!ok)
            throw new AppError(403, "FORBIDDEN");
    }
    async writeTimeline(orderId, actor, eventType, payload) {
        const actorUserId = actor.id || SYSTEM_ACTOR_ID;
        const timelineActorId = actorUserId === SYSTEM_ACTOR_ID ? null : actorUserId;
        await this.prisma.timelineEvent.create({
            data: {
                workspaceId: orderId,
                eventType,
                actorUserId: timelineActorId,
                payload: payload,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                workspaceId: orderId,
                actorUserId,
                actorEmail: actor.email,
                actorRole: actor.role,
                action: eventType,
                fromState: String(payload.fromStatus ?? ""),
                toState: String(payload.toStatus ?? payload.status ?? ""),
                payload: payload,
            },
        });
        socketBus.emitToWorkspace(orderId, "issue.updated", {
            workspaceId: orderId,
            issueId: payload.issueId,
            eventType,
        });
    }
    async loadUsers(ids) {
        const unique = [...new Set(ids.filter(Boolean))];
        if (!unique.length)
            return new Map();
        const users = await this.prisma.user.findMany({
            where: { id: { in: unique } },
            select: { id: true, displayName: true, email: true },
        });
        return new Map(users.map((u) => [
            u.id,
            { id: u.id, name: u.displayName || u.email, email: u.email },
        ]));
    }
    toDto(row, users, actor) {
        return {
            id: row.id,
            orderId: row.orderId,
            relatedEntityType: row.relatedEntityType ?? null,
            relatedEntityId: row.relatedEntityId,
            category: row.category,
            severity: row.severity,
            status: row.status,
            title: row.title,
            description: row.description,
            assignedTaskId: row.assignedTaskId,
            reportedBy: users.get(row.reportedById) ?? { id: row.reportedById, name: "User" },
            resolvedBy: row.resolvedById
                ? users.get(row.resolvedById) ?? { id: row.resolvedById, name: "User" }
                : null,
            resolvedAt: row.resolvedAt?.toISOString() ?? null,
            closedAt: row.closedAt?.toISOString() ?? null,
            resolutionNote: row.resolutionNote,
            resolutionSuggested: !!row.resolutionSuggestedAt,
            automationKey: row.automationKey,
            impactType: row.impactType ?? null,
            ownerRole: row.ownerRole ?? null,
            recommendedAction: row.recommendedAction ?? null,
            sourceEventType: row.sourceEventType ?? null,
            sourceRuleId: row.sourceRuleId ?? null,
            sourceAlertId: row.sourceAlertId ?? null,
            permissions: computeIssuePermissions(actor.role),
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }
    async list(actor, query) {
        const where = { deletedAt: null };
        if (query.orderId) {
            await this.assertOrderAccess(actor, query.orderId);
            where.orderId = query.orderId;
        }
        else if (!isPlatformAdminRole(actor.role)
            && actor.role !== "OPS_MANAGER"
            && actor.role !== "LOGISTICS_OPERATOR"
            && actor.role !== "DOCUMENT_CONTROLLER"
            && actor.role !== "SALES_CONTROL") {
            const parts = await this.prisma.workspaceParticipant.findMany({
                where: { userId: actor.id, leftAt: null },
                select: { workspaceId: true },
            });
            where.orderId = { in: parts.map((p) => p.workspaceId) };
        }
        if (query.status)
            where.status = query.status;
        if (query.severity)
            where.severity = query.severity;
        if (query.category)
            where.category = query.category;
        if (query.relatedEntityType)
            where.relatedEntityType = query.relatedEntityType;
        if (query.q?.trim()) {
            where.title = { contains: query.q.trim(), mode: "insensitive" };
        }
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const [total, rows] = await Promise.all([
            this.prisma.operationalIssue.count({ where }),
            this.prisma.operationalIssue.findMany({
                where,
                orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        const users = await this.loadUsers(rows.flatMap((r) => [r.reportedById, r.resolvedById].filter(Boolean)));
        return {
            items: rows.map((r) => this.toDto(r, users, actor)),
            page,
            pageSize,
            total,
        };
    }
    async summary(actor) {
        const scopeFilter = isPlatformAdminRole(actor.role)
            || actor.role === "OPS_MANAGER"
            || actor.role === "LOGISTICS_OPERATOR"
            || actor.role === "DOCUMENT_CONTROLLER"
            ? {}
            : {
                orderId: {
                    in: (await this.prisma.workspaceParticipant.findMany({
                        where: { userId: actor.id, leftAt: null },
                        select: { workspaceId: true },
                    })).map((p) => p.workspaceId),
                },
            };
        const base = { deletedAt: null, ...scopeFilter };
        const openStatuses = ["OPEN", "IN_PROGRESS"];
        const [open, critical, resolvedToday, inspectionFailures, shipmentDelays, allOpen] = await Promise.all([
            this.prisma.operationalIssue.count({
                where: { ...base, status: { in: [...openStatuses] } },
            }),
            this.prisma.operationalIssue.count({
                where: { ...base, status: { in: [...openStatuses] }, severity: "CRITICAL" },
            }),
            this.prisma.operationalIssue.count({
                where: {
                    ...base,
                    status: { in: ["RESOLVED", "CLOSED"] },
                    resolvedAt: { gte: startOfTodayUtc(), lt: endOfTodayUtc() },
                },
            }),
            this.prisma.operationalIssue.count({
                where: {
                    ...base,
                    status: { in: [...openStatuses] },
                    category: "INSPECTION_FAILURE",
                },
            }),
            this.prisma.operationalIssue.count({
                where: {
                    ...base,
                    status: { in: [...openStatuses] },
                    category: "SHIPMENT_DELAY",
                },
            }),
            this.prisma.operationalIssue.findMany({
                where: { ...base, status: { in: [...openStatuses] } },
                select: { category: true, severity: true },
            }),
        ]);
        const byCategory = {};
        const bySeverity = {};
        for (const row of allOpen) {
            byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
            bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1;
        }
        return {
            open,
            critical,
            resolvedToday,
            inspectionFailures,
            shipmentDelays,
            byCategory,
            bySeverity,
        };
    }
    async get(id, actor) {
        const row = await this.prisma.operationalIssue.findFirst({
            where: { id, deletedAt: null },
        });
        if (!row)
            throw new AppError(404, "ISSUE_NOT_FOUND");
        await this.assertOrderAccess(actor, row.orderId);
        const users = await this.loadUsers([row.reportedById, row.resolvedById].filter(Boolean));
        return this.toDto(row, users, actor);
    }
    async create(actor, input) {
        await this.assertOrderAccess(actor, input.orderId);
        const perms = computeIssuePermissions(actor.role);
        if (!perms.canCreate)
            throw new AppError(403, "FORBIDDEN");
        const order = await this.prisma.workspace.findUnique({
            where: { id: input.orderId },
            select: { id: true, type: true },
        });
        if (!order || order.type !== "ORDER")
            throw new AppError(404, "ORDER_NOT_FOUND");
        let assignedTaskId = input.assignedTaskId ?? null;
        if (input.createLinkedTask && !assignedTaskId) {
            const { OperationalTaskService } = await import("../operational-task/operational-task.service.js");
            const taskSvc = new OperationalTaskService(this.prisma);
            const task = await taskSvc.create(actor, {
                orderId: input.orderId,
                title: `Resolve: ${input.title.trim()}`,
                description: input.description ?? null,
                priority: input.severity === "CRITICAL" || input.severity === "HIGH" ? "HIGH" : "MEDIUM",
                relatedEntityType: "ORDER",
                relatedEntityId: input.orderId,
            });
            assignedTaskId = task.id;
        }
        const row = await this.prisma.operationalIssue.create({
            data: {
                orderId: input.orderId,
                title: input.title.trim(),
                description: input.description ?? null,
                category: input.category,
                severity: input.severity ?? "MEDIUM",
                status: "OPEN",
                relatedEntityType: input.relatedEntityType ?? null,
                relatedEntityId: input.relatedEntityId ?? null,
                assignedTaskId,
                reportedById: actor.id,
            },
        });
        await this.writeTimeline(input.orderId, actor, "issue.created", {
            issueId: row.id,
            title: row.title,
            category: row.category,
            severity: row.severity,
            status: row.status,
            assignedTaskId,
        });
        return this.get(row.id, actor);
    }
    async patch(id, actor, input) {
        const row = await this.prisma.operationalIssue.findFirst({
            where: { id, deletedAt: null },
        });
        if (!row)
            throw new AppError(404, "ISSUE_NOT_FOUND");
        await this.assertOrderAccess(actor, row.orderId);
        const perms = computeIssuePermissions(actor.role);
        if (!perms.canUpdate)
            throw new AppError(403, "FORBIDDEN");
        if (row.status === "CLOSED")
            throw new AppError(409, "ISSUE_CLOSED");
        const updated = await this.prisma.operationalIssue.update({
            where: { id },
            data: {
                title: input.title,
                description: input.description === undefined ? undefined : input.description,
                category: input.category,
                severity: input.severity,
                status: input.status,
                relatedEntityType: input.relatedEntityType === undefined ? undefined : input.relatedEntityType,
                relatedEntityId: input.relatedEntityId === undefined ? undefined : input.relatedEntityId,
                assignedTaskId: input.assignedTaskId === undefined ? undefined : input.assignedTaskId,
            },
        });
        await this.writeTimeline(row.orderId, actor, "issue.updated", {
            issueId: id,
            fromStatus: row.status,
            toStatus: updated.status,
        });
        if (input.assignedTaskId && input.assignedTaskId !== row.assignedTaskId) {
            await this.writeTimeline(row.orderId, actor, "issue.assigned", {
                issueId: id,
                assignedTaskId: input.assignedTaskId,
            });
        }
        return this.get(id, actor);
    }
    async resolve(id, actor, input = {}) {
        const row = await this.prisma.operationalIssue.findFirst({
            where: { id, deletedAt: null },
        });
        if (!row)
            throw new AppError(404, "ISSUE_NOT_FOUND");
        await this.assertOrderAccess(actor, row.orderId);
        const perms = computeIssuePermissions(actor.role);
        if (row.status === "CLOSED")
            throw new AppError(409, "ISSUE_CLOSED");
        const close = !!input.close;
        if (close && !perms.canClose)
            throw new AppError(403, "FORBIDDEN");
        if (!close && !perms.canResolve)
            throw new AppError(403, "FORBIDDEN");
        if (!close && row.status === "RESOLVED")
            throw new AppError(409, "ISSUE_ALREADY_RESOLVED");
        await this.prisma.operationalIssue.update({
            where: { id },
            data: {
                status: close ? "CLOSED" : "RESOLVED",
                resolvedAt: row.resolvedAt ?? new Date(),
                resolvedById: row.resolvedById ?? actor.id,
                closedAt: close ? new Date() : null,
                closedById: close ? actor.id : null,
                resolutionNote: input.resolutionNote ?? row.resolutionNote,
            },
        });
        if (row.status !== "RESOLVED") {
            await this.writeTimeline(row.orderId, actor, "issue.resolved", {
                issueId: id,
                fromStatus: row.status,
                toStatus: close ? "CLOSED" : "RESOLVED",
                resolutionNote: input.resolutionNote ?? null,
            });
        }
        if (close) {
            await this.writeTimeline(row.orderId, actor, "issue.closed", {
                issueId: id,
                fromStatus: row.status === "RESOLVED" ? "RESOLVED" : "RESOLVED",
                toStatus: "CLOSED",
            });
        }
        return this.get(id, actor);
    }
    async reopen(id, actor) {
        const row = await this.prisma.operationalIssue.findFirst({
            where: { id, deletedAt: null },
        });
        if (!row)
            throw new AppError(404, "ISSUE_NOT_FOUND");
        await this.assertOrderAccess(actor, row.orderId);
        const perms = computeIssuePermissions(actor.role);
        if (!perms.canReopen)
            throw new AppError(403, "FORBIDDEN");
        if (row.status !== "RESOLVED" && row.status !== "CLOSED") {
            throw new AppError(409, "ISSUE_NOT_REOPENABLE");
        }
        await this.prisma.operationalIssue.update({
            where: { id },
            data: {
                status: "OPEN",
                resolvedAt: null,
                resolvedById: null,
                closedAt: null,
                closedById: null,
                resolutionSuggestedAt: null,
            },
        });
        await this.writeTimeline(row.orderId, actor, "issue.reopened", {
            issueId: id,
            fromStatus: row.status,
            toStatus: "OPEN",
        });
        return this.get(id, actor);
    }
    async softDelete(id, actor) {
        const row = await this.prisma.operationalIssue.findFirst({
            where: { id, deletedAt: null },
        });
        if (!row)
            throw new AppError(404, "ISSUE_NOT_FOUND");
        await this.assertOrderAccess(actor, row.orderId);
        if (!isPlatformAdminRole(actor.role) && actor.role !== "OPS_MANAGER") {
            throw new AppError(403, "FORBIDDEN");
        }
        await this.prisma.operationalIssue.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.writeTimeline(row.orderId, actor, "issue.deleted", { issueId: id });
        return { deleted: true };
    }
    /** When a linked task completes — suggest resolution; never auto-close. */
    async suggestResolutionFromTask(taskId, actor) {
        const issues = await this.prisma.operationalIssue.findMany({
            where: {
                assignedTaskId: taskId,
                deletedAt: null,
                status: { in: ["OPEN", "IN_PROGRESS"] },
            },
        });
        for (const issue of issues) {
            await this.prisma.operationalIssue.update({
                where: { id: issue.id },
                data: {
                    resolutionSuggestedAt: new Date(),
                    status: issue.status === "OPEN" ? "IN_PROGRESS" : issue.status,
                },
            });
            await this.writeTimeline(issue.orderId, actor, "issue.updated", {
                issueId: issue.id,
                resolutionSuggested: true,
                fromTaskId: taskId,
                fromStatus: issue.status,
                toStatus: issue.status === "OPEN" ? "IN_PROGRESS" : issue.status,
            });
        }
    }
    /** Idempotent automation helper. Refreshes open issues instead of duplicating. */
    async ensureAutomatedIssue(input) {
        const existing = await this.prisma.operationalIssue.findFirst({
            where: {
                orderId: input.orderId,
                automationKey: input.automationKey,
                deletedAt: null,
            },
        });
        if (existing) {
            if (existing.status === "OPEN" || existing.status === "IN_PROGRESS") {
                await this.prisma.operationalIssue.update({
                    where: { id: existing.id },
                    data: {
                        title: input.title,
                        description: input.description ?? existing.description,
                        severity: input.severity ?? existing.severity,
                        impactType: input.impactType ?? existing.impactType,
                        ownerRole: input.ownerRole ?? existing.ownerRole,
                        recommendedAction: input.recommendedAction ?? existing.recommendedAction,
                        sourceEventType: input.sourceEventType ?? existing.sourceEventType,
                        sourceRuleId: input.sourceRuleId ?? existing.sourceRuleId,
                        sourceAlertId: input.sourceAlertId ?? existing.sourceAlertId,
                        assignedTaskId: input.assignedTaskId ?? existing.assignedTaskId,
                    },
                });
            }
            else if (existing.status === "RESOLVED" || existing.status === "CLOSED") {
                // Sprint 38 — re-open when condition returns (e.g. ETA moved earlier / readiness regresses)
                await this.prisma.operationalIssue.update({
                    where: { id: existing.id },
                    data: {
                        status: "OPEN",
                        title: input.title,
                        description: input.description ?? existing.description,
                        severity: input.severity ?? existing.severity,
                        impactType: input.impactType ?? existing.impactType,
                        ownerRole: input.ownerRole ?? existing.ownerRole,
                        recommendedAction: input.recommendedAction ?? existing.recommendedAction,
                        sourceEventType: input.sourceEventType ?? existing.sourceEventType,
                        sourceRuleId: input.sourceRuleId ?? existing.sourceRuleId,
                        sourceAlertId: input.sourceAlertId ?? existing.sourceAlertId,
                        assignedTaskId: input.assignedTaskId ?? existing.assignedTaskId,
                        resolvedAt: null,
                        resolvedById: null,
                        resolutionNote: null,
                    },
                });
            }
            return { id: existing.id, created: false };
        }
        const createdById = input.actorUserId ?? SYSTEM_ACTOR_ID;
        try {
            const row = await this.prisma.operationalIssue.create({
                data: {
                    orderId: input.orderId,
                    title: input.title,
                    description: input.description ?? null,
                    category: input.category,
                    severity: input.severity ?? "HIGH",
                    status: "OPEN",
                    relatedEntityType: input.relatedEntityType ?? null,
                    relatedEntityId: input.relatedEntityId ?? null,
                    assignedTaskId: input.assignedTaskId ?? null,
                    reportedById: createdById,
                    automationKey: input.automationKey,
                    impactType: input.impactType ?? null,
                    ownerRole: input.ownerRole ?? null,
                    recommendedAction: input.recommendedAction ?? null,
                    sourceEventType: input.sourceEventType ?? null,
                    sourceRuleId: input.sourceRuleId ?? null,
                    sourceAlertId: input.sourceAlertId ?? null,
                },
            });
            await this.writeTimeline(input.orderId, { id: createdById, email: "system@demaxtore.local", role: "ADMIN" }, "issue.created", {
                issueId: row.id,
                title: row.title,
                category: row.category,
                automationKey: input.automationKey,
                status: row.status,
                impactType: input.impactType,
                ownerRole: input.ownerRole,
                sourceRuleId: input.sourceRuleId,
            });
            return { id: row.id, created: true };
        }
        catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
                const again = await this.prisma.operationalIssue.findFirst({
                    where: { orderId: input.orderId, automationKey: input.automationKey },
                });
                return { id: again.id, created: false };
            }
            throw e;
        }
    }
    /** Deterministic auto-resolve by automation key (history preserved). */
    async resolveAutomatedIssue(input) {
        const existing = await this.prisma.operationalIssue.findFirst({
            where: {
                orderId: input.orderId,
                automationKey: input.automationKey,
                deletedAt: null,
                status: { in: ["OPEN", "IN_PROGRESS"] },
            },
        });
        if (!existing)
            return null;
        await this.prisma.operationalIssue.update({
            where: { id: existing.id },
            data: {
                status: "RESOLVED",
                resolvedAt: new Date(),
                resolvedById: SYSTEM_ACTOR_ID,
                resolutionNote: input.resolutionNote,
            },
        });
        await this.writeTimeline(input.orderId, { id: SYSTEM_ACTOR_ID, email: "system@demaxtore.local", role: "ADMIN" }, "issue.resolved", {
            issueId: existing.id,
            automationKey: input.automationKey,
            fromStatus: existing.status,
            toStatus: "RESOLVED",
            automatic: true,
        });
        return { id: existing.id, resolved: true };
    }
}
export { OPERATIONAL_ISSUE_AUTOMATION_KEYS };
//# sourceMappingURL=operational-issue.service.js.map