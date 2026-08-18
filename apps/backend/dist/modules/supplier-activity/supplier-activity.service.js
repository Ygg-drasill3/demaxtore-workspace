import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
import { canAccessRfq } from "../rfq/rfq.policy.js";
import { socketBus } from "../../realtime/socket-bus.js";
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
async function assertAccess(actor, workspaceId) {
    if (!(await canAccessRfq(prisma, actor, workspaceId))) {
        throw new AppError(403, "FORBIDDEN");
    }
}
function assertBuyerOrAdmin(actor) {
    if (actor.role !== "BUYER" && actor.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN_ROLE");
    }
}
/** Active invite list: assignments first, else COUNTERPARTY participants (seed / legacy). */
async function invitedSupplierIds(workspaceId) {
    const assignments = await prisma.supplierAssignment.findMany({
        where: { workspaceId, removedAt: null },
        select: { supplierUserId: true },
        orderBy: { assignedAt: "asc" },
    });
    if (assignments.length > 0) {
        return assignments.map((a) => a.supplierUserId);
    }
    const counterparties = await prisma.workspaceParticipant.findMany({
        where: { workspaceId, participantRole: "COUNTERPARTY" },
        select: { userId: true },
    });
    return counterparties.map((p) => p.userId);
}
function stageToEngagement(stage) {
    switch (stage) {
        case "INVITED": return 1;
        case "VIEWED": return 2;
        case "RETURNED": return 3;
        case "QUOTED": return 4;
        case "DECLINED": return 4;
        default: return 1;
    }
}
/** Supplier opened the RFQ workspace (telemetry or activity beyond INVITED). */
function hasOpenedWorkspace(supplierId, logs, viewedViaTelemetry) {
    if (viewedViaTelemetry.has(supplierId))
        return true;
    const log = logs.get(supplierId);
    if (!log)
        return false;
    return log.stage !== "INVITED";
}
function classifySupplier(supplierId, logs, quotations, viewedViaTelemetry) {
    const q = quotations.get(supplierId);
    const log = logs.get(supplierId);
    if (q && !q.withdrawnAt)
        return { stage: "QUOTED" };
    if (q?.withdrawnAt || log?.stage === "DECLINED")
        return { stage: "DECLINED" };
    if (log?.stage === "RETURNED")
        return { stage: "RETURNED" };
    if (log?.stage === "VIEWED" ||
        log?.stage === "QUOTED" ||
        viewedViaTelemetry.has(supplierId)) {
        return { stage: "VIEWED" };
    }
    return { stage: "INVITED" };
}
async function loadEngagementData(workspaceId) {
    const [invitedIds, logs, quotationRows, telemetryViews] = await Promise.all([
        invitedSupplierIds(workspaceId),
        prisma.supplierActivityLog.findMany({ where: { workspaceId } }),
        prisma.quotation.findMany({
            where: { workspaceId },
            select: { supplierUserId: true, total: true, withdrawnAt: true, submittedAt: true },
            orderBy: { submittedAt: "desc" },
        }),
        prisma.telemetryEvent.groupBy({
            by: ["userId"],
            where: {
                workspaceId,
                event: "workspace.viewed",
                userId: { not: null },
            },
        }),
    ]);
    const logsBySupplier = new Map(logs.map((l) => [
        l.supplierUserId,
        {
            stage: l.stage,
            lastActivityAt: l.lastActivityAt,
            nudgedAt: l.nudgedAt,
            declineReason: l.declineReason,
        },
    ]));
    const quotationsBySupplier = new Map();
    for (const q of quotationRows) {
        if (!quotationsBySupplier.has(q.supplierUserId)) {
            quotationsBySupplier.set(q.supplierUserId, { total: Number(q.total), withdrawnAt: q.withdrawnAt });
        }
    }
    const viewedViaTelemetry = new Set(telemetryViews.map((t) => t.userId).filter((id) => typeof id === "string"));
    return { invitedIds, logsBySupplier, quotationsBySupplier, viewedViaTelemetry };
}
function buildSummary(invitedIds, logsBySupplier, quotationsBySupplier, viewedViaTelemetry) {
    let quoted = 0;
    let declined = 0;
    let viewed = 0;
    for (const sid of invitedIds) {
        const { stage } = classifySupplier(sid, logsBySupplier, quotationsBySupplier, viewedViaTelemetry);
        if (stage === "QUOTED")
            quoted++;
        else if (stage === "DECLINED")
            declined++;
        if (hasOpenedWorkspace(sid, logsBySupplier, viewedViaTelemetry))
            viewed++;
    }
    const silent = Math.max(0, invitedIds.length - viewed);
    const latestLog = [...logsBySupplier.values()].sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())[0];
    return {
        invited: invitedIds.length,
        viewed,
        quoted,
        declined,
        silent,
        updatedAt: (latestLog?.lastActivityAt ?? new Date()).toISOString(),
    };
}
export async function getSummary(workspaceId, actor) {
    await assertAccess(actor, workspaceId);
    assertBuyerOrAdmin(actor);
    const data = await loadEngagementData(workspaceId);
    return buildSummary(data.invitedIds, data.logsBySupplier, data.quotationsBySupplier, data.viewedViaTelemetry);
}
export async function getDetail(workspaceId, actor) {
    await assertAccess(actor, workspaceId);
    assertBuyerOrAdmin(actor);
    const data = await loadEngagementData(workspaceId);
    const summary = buildSummary(data.invitedIds, data.logsBySupplier, data.quotationsBySupplier, data.viewedViaTelemetry);
    if (data.invitedIds.length === 0) {
        return { summary, rows: [] };
    }
    const suppliers = await prisma.user.findMany({
        where: { id: { in: data.invitedIds } },
        select: {
            id: true,
            displayName: true,
            organisation: { select: { name: true, location: true } },
            createdAt: true,
        },
    });
    const byId = new Map(suppliers.map((s) => [s.id, s]));
    const rows = data.invitedIds.map((supplierId) => {
        const s = byId.get(supplierId);
        const log = data.logsBySupplier.get(supplierId);
        const q = data.quotationsBySupplier.get(supplierId);
        const { stage } = classifySupplier(supplierId, data.logsBySupplier, data.quotationsBySupplier, data.viewedViaTelemetry);
        const nudgedAt = log?.nudgedAt?.toISOString() ?? null;
        const canNudge = stage !== "QUOTED" &&
            stage !== "DECLINED" &&
            (!log?.nudgedAt || Date.now() - log.nudgedAt.getTime() >= NUDGE_COOLDOWN_MS);
        return {
            supplierId,
            supplierName: s?.displayName ?? "Supplier",
            location: s?.organisation?.location ?? s?.organisation?.name ?? null,
            verifiedSince: s?.createdAt.toISOString() ?? null,
            pastPoCount: 0,
            stage,
            engagementDots: stageToEngagement(stage),
            lastActivityAt: log?.lastActivityAt.toISOString() ?? null,
            quotedTotal: q && !q.withdrawnAt ? q.total : null,
            declineReason: log?.declineReason ?? null,
            nudgedAt,
            canNudge,
        };
    });
    return { summary, rows };
}
function emitActivityUpdated(workspaceId) {
    socketBus.emitToWorkspace(workspaceId, "workspace:update", { workspaceId });
}
/** Upsert INVITED rows when admin assigns suppliers (idempotent). */
export async function ensureInvitedLogs(tx, workspaceId, supplierUserIds) {
    for (const supplierUserId of supplierUserIds) {
        await tx.supplierActivityLog.upsert({
            where: { workspaceId_supplierUserId: { workspaceId, supplierUserId } },
            create: { workspaceId, supplierUserId, stage: "INVITED" },
            update: {},
        });
    }
}
export async function recordSupplierView(workspaceId, actor) {
    if (actor.role !== "SUPPLIER")
        return;
    if (!(await canAccessRfq(prisma, actor, workspaceId)))
        return;
    const existing = await prisma.supplierActivityLog.findUnique({
        where: { workspaceId_supplierUserId: { workspaceId, supplierUserId: actor.id } },
    });
    if (!existing) {
        await prisma.supplierActivityLog.create({
            data: { workspaceId, supplierUserId: actor.id, stage: "VIEWED" },
        });
        emitActivityUpdated(workspaceId);
        return;
    }
    if (existing.stage === "INVITED") {
        await prisma.supplierActivityLog.update({
            where: { id: existing.id },
            data: { stage: "VIEWED", lastActivityAt: new Date() },
        });
        emitActivityUpdated(workspaceId);
        return;
    }
    if (existing.stage === "VIEWED" || existing.stage === "RETURNED") {
        await prisma.supplierActivityLog.update({
            where: { id: existing.id },
            data: { lastActivityAt: new Date() },
        });
        return;
    }
    // QUOTED / DECLINED — already opened; keep stage, refresh timestamp only.
    if (existing.stage === "QUOTED" || existing.stage === "DECLINED") {
        await prisma.supplierActivityLog.update({
            where: { id: existing.id },
            data: { lastActivityAt: new Date() },
        });
    }
}
/** Call when a supplier loads the RFQ workspace (GET /rfq/:id). */
export async function recordSupplierViewIfApplicable(workspaceId, actor, participants) {
    if (actor.role !== "SUPPLIER")
        return;
    const isCounterparty = participants.some((p) => p.userId === actor.id && p.participantRole === "COUNTERPARTY");
    if (!isCounterparty)
        return;
    await recordSupplierView(workspaceId, actor);
}
export async function markQuoted(workspaceId, supplierUserId) {
    await prisma.supplierActivityLog.upsert({
        where: { workspaceId_supplierUserId: { workspaceId, supplierUserId } },
        create: { workspaceId, supplierUserId, stage: "QUOTED" },
        update: { stage: "QUOTED", lastActivityAt: new Date() },
    });
    emitActivityUpdated(workspaceId);
}
export async function markDeclined(workspaceId, supplierUserId, reason) {
    await prisma.supplierActivityLog.upsert({
        where: { workspaceId_supplierUserId: { workspaceId, supplierUserId } },
        create: {
            workspaceId,
            supplierUserId,
            stage: "DECLINED",
            declineReason: reason ?? null,
        },
        update: {
            stage: "DECLINED",
            declineReason: reason ?? null,
            lastActivityAt: new Date(),
        },
    });
    emitActivityUpdated(workspaceId);
}
async function nudgeOne(workspaceId, supplierUserId) {
    const log = await prisma.supplierActivityLog.findUnique({
        where: { workspaceId_supplierUserId: { workspaceId, supplierUserId } },
    });
    if (!log) {
        throw new AppError(404, "SUPPLIER_NOT_ON_RFQ");
    }
    if (log.nudgedAt && Date.now() - log.nudgedAt.getTime() < NUDGE_COOLDOWN_MS) {
        throw new AppError(429, "NUDGE_RATE_LIMITED");
    }
    await prisma.supplierActivityLog.update({
        where: { id: log.id },
        data: { nudgedAt: new Date(), lastActivityAt: new Date() },
    });
    emitActivityUpdated(workspaceId);
}
export async function nudgeSupplier(workspaceId, supplierUserId, actor) {
    await assertAccess(actor, workspaceId);
    if (actor.role !== "BUYER" && actor.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN_ROLE");
    }
    await nudgeOne(workspaceId, supplierUserId);
}
export async function nudgeSilentSuppliers(workspaceId, actor) {
    await assertAccess(actor, workspaceId);
    if (actor.role !== "BUYER" && actor.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN_ROLE");
    }
    const data = await loadEngagementData(workspaceId);
    const silentIds = data.invitedIds.filter((sid) => !hasOpenedWorkspace(sid, data.logsBySupplier, data.viewedViaTelemetry));
    for (const sid of silentIds) {
        try {
            await nudgeOne(workspaceId, sid);
        }
        catch (e) {
            if (!(e instanceof AppError) || e.status !== 429)
                throw e;
        }
    }
}
//# sourceMappingURL=supplier-activity.service.js.map