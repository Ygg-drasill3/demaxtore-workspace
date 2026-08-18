import { DEFAULT_SHIPMENT_MILESTONE_PLAN, SHIPMENT_MILESTONE_TYPE_LABELS, } from "@dmx/contracts/shipment-milestones";
import { OPERATIONAL_TASK_AUTOMATION_KEYS } from "@dmx/contracts/operational-task";
import { OPS_AUTOMATION_RULE_KEYS } from "@dmx/contracts/operational-configuration";
import { cached, invalidateCache } from "../../lib/response-cache.js";
import { Forbidden, NotFound, Validation } from "../../lib/errors.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
import { AppError } from "../../utils/httpErrors.js";
const CACHE_PREFIX = "ops-config:";
const CACHE_TTL_MS = 60_000;
const DEFAULT_AUTOMATION = [
    {
        key: "inspection.requested",
        name: "Inspection requested → Assign inspector task",
        description: "Creates an Assign inspector operational task.",
        priority: 10,
    },
    {
        key: "inspection.failed",
        name: "Inspection FAIL → Issue + Resolve NCR task",
        description: "Creates a critical issue and Resolve NCR task.",
        priority: 20,
    },
    {
        key: "shipment.booked",
        name: "Shipment booking → Upload BL task",
        description: "Creates Upload Bill of Lading task after first booking.",
        priority: 30,
    },
    {
        key: "po.revised",
        name: "PO revised → Review revision task",
        description: "Creates a review task for PO revisions.",
        priority: 40,
    },
    {
        key: "order.approved_for_shipment",
        name: "Approved for shipment → Create booking task",
        description: "Creates Create shipment booking task.",
        priority: 50,
    },
    {
        key: "milestone.activate_next",
        name: "Milestone completed → Activate next",
        description: "When a milestone is completed, activate the next pending milestone.",
        priority: 60,
    },
    {
        key: "customs.pre_arrival.enabled",
        name: "Pre-arrival customs preparation",
        description: "Sprint 38 — Auto-ensure Turkey CustomsCase and time-aware readiness risks before ATA (operational thresholds).",
        priority: 70,
    },
];
const DEFAULT_TASK_TEMPLATES = [
    {
        name: "Assign inspector",
        category: "INSPECTION",
        priority: "HIGH",
        dueOffsetDays: 2,
        automationTrigger: OPERATIONAL_TASK_AUTOMATION_KEYS.ASSIGN_INSPECTOR,
        description: "Assign an inspector and schedule the quality inspection.",
        enabled: true,
    },
    {
        name: "Resolve NCR",
        category: "QUALITY",
        priority: "CRITICAL",
        dueOffsetDays: 3,
        automationTrigger: OPERATIONAL_TASK_AUTOMATION_KEYS.RESOLVE_NCR,
        description: "Inspection failed — create/close NCR and plan reinspection if required.",
        enabled: true,
    },
    {
        name: "Upload Bill of Lading",
        category: "DOCUMENT",
        priority: "HIGH",
        dueOffsetDays: 5,
        automationTrigger: OPERATIONAL_TASK_AUTOMATION_KEYS.UPLOAD_BILL_OF_LADING,
        description: "Upload the Bill of Lading to the Commercial Document Center.",
        enabled: true,
    },
    {
        name: "Review Purchase Order revision",
        category: "GENERAL",
        priority: "HIGH",
        dueOffsetDays: 2,
        automationTrigger: OPERATIONAL_TASK_AUTOMATION_KEYS.REVIEW_REVISION,
        description: "Review the latest PO revision and acknowledge changes.",
        enabled: true,
    },
    {
        name: "Create shipment booking",
        category: "SHIPMENT",
        priority: "MEDIUM",
        dueOffsetDays: 3,
        automationTrigger: OPERATIONAL_TASK_AUTOMATION_KEYS.CREATE_SHIPMENT_BOOKING,
        description: "Open Shipment Workspace and confirm freight booking.",
        enabled: true,
    },
];
export function computeOpsConfigPermissions(role) {
    const r = String(role);
    const canView = isPlatformAdminRole(r)
        || ["OPS_MANAGER", "LOGISTICS_OPERATOR", "DOCUMENT_CONTROLLER", "SALES_CONTROL", "FINANCE_OPERATOR"].includes(r);
    const canManageTemplates = isPlatformAdminRole(r) || r === "OPS_MANAGER" || r === "DOCUMENT_CONTROLLER";
    const canManageAll = isPlatformAdminRole(r) || r === "OPS_MANAGER";
    return { canView, canManageTemplates, canManageAll };
}
/**
 * SPR-30-08 — Operational configuration metadata.
 * Does not own business execution; affects future operations only.
 */
export class OperationalConfigurationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    assertView(role) {
        const perms = computeOpsConfigPermissions(role);
        if (!perms.canView)
            throw Forbidden("Operations configuration requires viewer access");
        return perms;
    }
    assertTemplates(role) {
        const perms = this.assertView(role);
        if (!perms.canManageTemplates)
            throw Forbidden("Template management requires manager access");
        return perms;
    }
    assertAll(role) {
        const perms = this.assertView(role);
        if (!perms.canManageAll)
            throw Forbidden("Configuration changes require admin/manager access");
        return perms;
    }
    async audit(action, actor, entityType, entityId, payload) {
        await this.prisma.operationalConfigAudit.create({
            data: {
                action,
                actorUserId: actor?.id ?? null,
                actorEmail: actor?.email ?? null,
                actorRole: actor ? String(actor.role) : null,
                entityType,
                entityId,
                payload: payload,
            },
        }).catch(() => undefined);
    }
    invalidate() {
        invalidateCache(CACHE_PREFIX);
    }
    /** Ensure singleton settings + seeded rules/templates exist (idempotent). */
    async ensureSeeded() {
        const settings = await this.prisma.operationalSettings.findFirst();
        if (!settings) {
            await this.prisma.operationalSettings.create({ data: {} });
        }
        for (const rule of DEFAULT_AUTOMATION) {
            await this.prisma.operationalAutomationRule.upsert({
                where: { key: rule.key },
                create: rule,
                update: {},
            });
        }
        const taskCount = await this.prisma.operationalTaskTemplate.count({
            where: { deletedAt: null },
        });
        if (taskCount === 0) {
            for (const t of DEFAULT_TASK_TEMPLATES) {
                await this.prisma.operationalTaskTemplate.create({
                    data: {
                        name: t.name,
                        category: t.category,
                        priority: t.priority,
                        defaultAssigneeRole: t.defaultAssigneeRole ?? null,
                        dueOffsetDays: t.dueOffsetDays,
                        automationTrigger: t.automationTrigger ?? null,
                        description: t.description ?? null,
                        enabled: t.enabled ?? true,
                    },
                });
            }
        }
        const msCount = await this.prisma.operationalMilestoneTemplate.count({
            where: { deletedAt: null },
        });
        if (msCount === 0) {
            for (const m of DEFAULT_SHIPMENT_MILESTONE_PLAN) {
                await this.prisma.operationalMilestoneTemplate.create({
                    data: {
                        type: m.type,
                        name: SHIPMENT_MILESTONE_TYPE_LABELS[m.type],
                        sequence: m.sequence,
                        defaultOffsetDays: 0,
                        enabled: true,
                        required: !m.skipByDefault,
                        skipByDefault: !!m.skipByDefault,
                    },
                });
            }
        }
    }
    async getConfiguration(actor) {
        const perms = this.assertView(actor.role);
        await this.ensureSeeded();
        return cached(`${CACHE_PREFIX}bundle`, CACHE_TTL_MS, async () => {
            const [settings, automation] = await Promise.all([
                this.prisma.operationalSettings.findFirstOrThrow(),
                this.prisma.operationalAutomationRule.findMany({
                    where: { deletedAt: null },
                    orderBy: [{ priority: "asc" }, { key: "asc" }],
                }),
            ]);
            return {
                version: settings.version,
                risk: {
                    atRiskMinutes: settings.riskAtRiskMinutes,
                    delayedMinutes: settings.riskDelayedMinutes,
                },
                defaults: {
                    etaBufferHours: settings.defaultEtaBufferHours,
                    issueSeverity: settings.defaultIssueSeverity,
                    taskPriority: settings.defaultTaskPriority,
                    completionDocsRequired: settings.completionDocsRequired,
                },
                automation: automation.map(toAutomationDto),
                updatedAt: settings.updatedAt.toISOString(),
                permissions: perms,
            };
        }).then((dto) => ({ ...dto, permissions: perms }));
    }
    async updateConfiguration(actor, input) {
        this.assertAll(actor.role);
        await this.ensureSeeded();
        const current = await this.prisma.operationalSettings.findFirstOrThrow();
        if (current.version !== input.version) {
            throw new AppError(409, "CONFIG_VERSION_CONFLICT", {
                message: "Configuration was updated by someone else. Reload and retry.",
                currentVersion: current.version,
            });
        }
        await this.prisma.operationalSettings.update({
            where: { id: current.id },
            data: {
                version: { increment: 1 },
                updatedById: actor.id,
                ...(input.risk
                    ? {
                        riskAtRiskMinutes: input.risk.atRiskMinutes,
                        riskDelayedMinutes: input.risk.delayedMinutes,
                    }
                    : {}),
                ...(input.defaults
                    ? {
                        defaultEtaBufferHours: input.defaults.etaBufferHours,
                        defaultIssueSeverity: input.defaults.issueSeverity,
                        defaultTaskPriority: input.defaults.taskPriority,
                        completionDocsRequired: input.defaults.completionDocsRequired,
                    }
                    : {}),
            },
        });
        this.invalidate();
        await this.audit(input.risk ? "risk.updated" : "configuration.updated", actor, "OperationalSettings", current.id, input);
        if (input.defaults && !input.risk) {
            await this.audit("configuration.updated", actor, "OperationalSettings", current.id, {
                defaults: input.defaults,
            });
        }
        return this.getConfiguration(actor);
    }
    async listAutomation(actor) {
        this.assertView(actor.role);
        await this.ensureSeeded();
        const rows = await this.prisma.operationalAutomationRule.findMany({
            where: { deletedAt: null },
            orderBy: [{ priority: "asc" }, { key: "asc" }],
        });
        return rows.map(toAutomationDto);
    }
    async patchAutomation(actor, id, input) {
        this.assertAll(actor.role);
        const row = await this.prisma.operationalAutomationRule.findFirst({
            where: { id, deletedAt: null },
        });
        if (!row)
            throw NotFound("Automation rule not found");
        const updated = await this.prisma.operationalAutomationRule.update({
            where: { id },
            data: {
                ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
                ...(input.priority !== undefined ? { priority: input.priority } : {}),
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
            },
        });
        this.invalidate();
        await this.audit("automation.updated", actor, "OperationalAutomationRule", id, input);
        return toAutomationDto(updated);
    }
    async listTaskTemplates(actor) {
        this.assertView(actor.role);
        await this.ensureSeeded();
        const rows = await this.prisma.operationalTaskTemplate.findMany({
            where: { deletedAt: null },
            orderBy: [{ name: "asc" }],
        });
        return rows.map(toTaskDto);
    }
    async createTaskTemplate(actor, input) {
        this.assertTemplates(actor.role);
        const row = await this.prisma.operationalTaskTemplate.create({
            data: {
                name: input.name,
                category: input.category,
                priority: input.priority,
                defaultAssigneeRole: input.defaultAssigneeRole ?? null,
                dueOffsetDays: input.dueOffsetDays,
                automationTrigger: input.automationTrigger ?? null,
                description: input.description ?? null,
                enabled: input.enabled ?? true,
            },
        });
        this.invalidate();
        await this.audit("template.created", actor, "OperationalTaskTemplate", row.id, { kind: "task" });
        return toTaskDto(row);
    }
    async patchTaskTemplate(actor, id, input) {
        this.assertTemplates(actor.role);
        const existing = await this.prisma.operationalTaskTemplate.findFirst({
            where: { id, deletedAt: null },
        });
        if (!existing)
            throw NotFound("Task template not found");
        const row = await this.prisma.operationalTaskTemplate.update({
            where: { id },
            data: {
                version: { increment: 1 },
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.category !== undefined ? { category: input.category } : {}),
                ...(input.priority !== undefined ? { priority: input.priority } : {}),
                ...(input.defaultAssigneeRole !== undefined
                    ? { defaultAssigneeRole: input.defaultAssigneeRole }
                    : {}),
                ...(input.dueOffsetDays !== undefined ? { dueOffsetDays: input.dueOffsetDays } : {}),
                ...(input.automationTrigger !== undefined
                    ? { automationTrigger: input.automationTrigger }
                    : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
                ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
            },
        });
        this.invalidate();
        await this.audit("template.updated", actor, "OperationalTaskTemplate", id, input);
        return toTaskDto(row);
    }
    async listMilestoneTemplates(actor) {
        this.assertView(actor.role);
        await this.ensureSeeded();
        const rows = await this.prisma.operationalMilestoneTemplate.findMany({
            where: { deletedAt: null },
            orderBy: [{ sequence: "asc" }],
        });
        return rows.map(toMilestoneDto);
    }
    async createMilestoneTemplate(actor, input) {
        this.assertTemplates(actor.role);
        const clash = await this.prisma.operationalMilestoneTemplate.findFirst({
            where: { type: input.type, deletedAt: null },
        });
        if (clash)
            throw Validation("Milestone type already exists");
        const row = await this.prisma.operationalMilestoneTemplate.create({
            data: {
                type: input.type,
                name: input.name,
                sequence: input.sequence,
                defaultOffsetDays: input.defaultOffsetDays,
                enabled: input.enabled ?? true,
                required: input.required ?? true,
                skipByDefault: input.skipByDefault ?? false,
            },
        });
        this.invalidate();
        await this.audit("template.created", actor, "OperationalMilestoneTemplate", row.id, { kind: "milestone" });
        return toMilestoneDto(row);
    }
    async patchMilestoneTemplate(actor, id, input) {
        this.assertTemplates(actor.role);
        const existing = await this.prisma.operationalMilestoneTemplate.findFirst({
            where: { id, deletedAt: null },
        });
        if (!existing)
            throw NotFound("Milestone template not found");
        const row = await this.prisma.operationalMilestoneTemplate.update({
            where: { id },
            data: {
                version: { increment: 1 },
                ...(input.type !== undefined ? { type: input.type } : {}),
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.sequence !== undefined ? { sequence: input.sequence } : {}),
                ...(input.defaultOffsetDays !== undefined
                    ? { defaultOffsetDays: input.defaultOffsetDays }
                    : {}),
                ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
                ...(input.required !== undefined ? { required: input.required } : {}),
                ...(input.skipByDefault !== undefined ? { skipByDefault: input.skipByDefault } : {}),
            },
        });
        this.invalidate();
        await this.audit("template.updated", actor, "OperationalMilestoneTemplate", id, input);
        return toMilestoneDto(row);
    }
    async listAudits(actor, limit = 50) {
        this.assertView(actor.role);
        const rows = await this.prisma.operationalConfigAudit.findMany({
            orderBy: { createdAt: "desc" },
            take: Math.min(limit, 200),
        });
        return rows.map((r) => ({
            id: r.id,
            action: r.action,
            actorEmail: r.actorEmail,
            actorRole: r.actorRole,
            entityType: r.entityType,
            entityId: r.entityId,
            payload: (r.payload ?? {}),
            createdAt: r.createdAt.toISOString(),
        }));
    }
    // ── Runtime resolvers (used by operational modules; cached) ───────────────
    async isAutomationEnabled(eventKey) {
        await this.ensureSeeded();
        const map = await cached(`${CACHE_PREFIX}automation-map`, CACHE_TTL_MS, async () => {
            const rows = await this.prisma.operationalAutomationRule.findMany({
                where: { deletedAt: null },
                select: { key: true, enabled: true },
            });
            return Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
        });
        if (!(eventKey in map))
            return true; // unknown events default on
        return !!map[eventKey];
    }
    async getRiskThresholds() {
        await this.ensureSeeded();
        return cached(`${CACHE_PREFIX}risk`, CACHE_TTL_MS, async () => {
            const s = await this.prisma.operationalSettings.findFirstOrThrow();
            return {
                atRiskMinutes: s.riskAtRiskMinutes,
                delayedMinutes: s.riskDelayedMinutes,
            };
        });
    }
    async getTaskTemplateForTrigger(automationKeyBase) {
        await this.ensureSeeded();
        const templates = await cached(`${CACHE_PREFIX}task-templates`, CACHE_TTL_MS, async () => {
            return this.prisma.operationalTaskTemplate.findMany({
                where: { deletedAt: null, enabled: true, automationTrigger: { not: null } },
            });
        });
        const hit = templates.find((t) => t.automationTrigger === automationKeyBase);
        if (!hit)
            return null;
        return {
            title: hit.name,
            description: hit.description,
            priority: hit.priority,
            dueOffsetDays: hit.dueOffsetDays,
        };
    }
    async getMilestonePlan() {
        await this.ensureSeeded();
        const rows = await cached(`${CACHE_PREFIX}milestone-plan`, CACHE_TTL_MS, async () => {
            return this.prisma.operationalMilestoneTemplate.findMany({
                where: { deletedAt: null, enabled: true },
                orderBy: { sequence: "asc" },
            });
        });
        if (!rows.length) {
            return DEFAULT_SHIPMENT_MILESTONE_PLAN.map((m) => ({
                type: m.type,
                sequence: m.sequence,
                skipByDefault: m.skipByDefault,
                defaultOffsetDays: 0,
                name: SHIPMENT_MILESTONE_TYPE_LABELS[m.type],
            }));
        }
        return rows.map((r) => ({
            type: r.type,
            sequence: r.sequence,
            skipByDefault: r.skipByDefault,
            defaultOffsetDays: r.defaultOffsetDays,
            name: r.name,
        }));
    }
    async getDefaults() {
        await this.ensureSeeded();
        return cached(`${CACHE_PREFIX}defaults`, CACHE_TTL_MS, async () => {
            const s = await this.prisma.operationalSettings.findFirstOrThrow();
            return {
                etaBufferHours: s.defaultEtaBufferHours,
                issueSeverity: s.defaultIssueSeverity,
                taskPriority: s.defaultTaskPriority,
                completionDocsRequired: s.completionDocsRequired,
            };
        });
    }
}
function toAutomationDto(r) {
    return {
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description,
        enabled: r.enabled,
        priority: r.priority,
        updatedAt: r.updatedAt.toISOString(),
    };
}
function toTaskDto(r) {
    return {
        id: r.id,
        name: r.name,
        category: r.category,
        priority: r.priority,
        defaultAssigneeRole: r.defaultAssigneeRole,
        dueOffsetDays: r.dueOffsetDays,
        automationTrigger: r.automationTrigger,
        description: r.description,
        enabled: r.enabled,
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
    };
}
function toMilestoneDto(r) {
    return {
        id: r.id,
        type: r.type,
        name: r.name,
        sequence: r.sequence,
        defaultOffsetDays: r.defaultOffsetDays,
        enabled: r.enabled,
        required: r.required,
        skipByDefault: r.skipByDefault,
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
    };
}
export { OPS_AUTOMATION_RULE_KEYS };
//# sourceMappingURL=operational-configuration.service.js.map