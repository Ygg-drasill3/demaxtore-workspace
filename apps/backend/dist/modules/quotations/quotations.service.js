// apps/backend/src/modules/quotations/quotations.service.ts
//
// Sprint 2.7 — supplier quotation submission runtime.
//
// Quotations are scoped to RFQ workspaces. The FSM action that gates each
// mutation is fired through RfqService.applyTransition() so timeline + audit +
// notification + socket emit all happen via the FSM-frozen single gateway.
//
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { RfqService } from "../rfq/rfq.service.js";
import { AppError } from "../../utils/httpErrors.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
import { canAccessRfq } from "../rfq/rfq.policy.js";
const rfqService = new RfqService(prisma);
// ─── Shared helpers ──────────────────────────────────────────────────────────
function lineItemRows(quotationId, payload) {
    return payload.lineItems.map((li) => ({
        quotationId,
        rfqLineItemId: li.rfqLineItemId ?? null,
        position: li.position,
        description: li.description,
        quantity: new Prisma.Decimal(li.quantity),
        unitPrice: new Prisma.Decimal(li.unitPrice),
        total: new Prisma.Decimal(li.quantity * li.unitPrice),
        packing: li.packing ?? null,
        priceUnit: li.priceUnit ?? null,
        moq: li.moq ?? null,
    }));
}
function totalFor(payload) {
    const t = payload.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    return new Prisma.Decimal(t);
}
function unitPriceAvgFor(payload) {
    let qty = 0;
    let val = 0;
    for (const li of payload.lineItems) {
        qty += li.quantity;
        val += li.quantity * li.unitPrice;
    }
    return qty > 0 ? val / qty : null;
}
async function assertWorkspaceOpen(workspaceId) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws)
        throw new AppError(404, "RFQ_NOT_FOUND");
    if (ws.state !== "RFQ_OPEN")
        throw new AppError(409, "RFQ_NOT_OPEN");
}
async function findActiveQuotation(workspaceId, supplierId) {
    return await prisma.quotation.findFirst({
        where: { workspaceId, supplierUserId: supplierId, withdrawnAt: null },
        orderBy: { submittedAt: "desc" },
    });
}
async function assertSupplierAssigned(workspaceId, supplierUserId) {
    const assignment = await prisma.supplierAssignment.findFirst({
        where: { workspaceId, supplierUserId, removedAt: null },
        select: { id: true },
    });
    if (assignment)
        return;
    const participant = await prisma.workspaceParticipant.findFirst({
        where: { workspaceId, userId: supplierUserId, participantRole: "COUNTERPARTY" },
        select: { id: true },
    });
    if (!participant)
        throw new AppError(403, "SUPPLIER_NOT_ASSIGNED");
}
async function loadSupplierActor(supplierUserId) {
    const supplier = await prisma.user.findUnique({
        where: { id: supplierUserId },
        select: { id: true, email: true, role: true },
    });
    if (!supplier || supplier.role !== "SUPPLIER")
        throw new AppError(400, "INVALID_SUPPLIER");
    return { id: supplier.id, email: supplier.email, role: "SUPPLIER" };
}
async function persistSubmittedQuotation(workspaceId, supplierUserId, payload) {
    const withdrawn = await prisma.quotation.findFirst({
        where: { workspaceId, supplierUserId, withdrawnAt: { not: null } },
    });
    return await prisma.$transaction(async (tx) => {
        let q;
        if (withdrawn) {
            await tx.quotationLineItem.deleteMany({ where: { quotationId: withdrawn.id } });
            q = await tx.quotation.update({
                where: { id: withdrawn.id },
                data: {
                    total: totalFor(payload),
                    unitPriceAvg: unitPriceAvgFor(payload),
                    currency: payload.currency,
                    leadTimeDays: payload.leadTimeDays ?? null,
                    moq: payload.moq ?? null,
                    incoterm: payload.incoterm ?? null,
                    paymentTerms: payload.paymentTerms ?? null,
                    sampleAvail: payload.sampleAvail ?? null,
                    validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
                    status: "SUBMITTED",
                    submittedAt: new Date(),
                    withdrawnAt: null,
                    revisedAt: null,
                },
            });
        }
        else {
            q = await tx.quotation.create({
                data: {
                    workspaceId,
                    supplierUserId,
                    total: totalFor(payload),
                    unitPriceAvg: unitPriceAvgFor(payload),
                    currency: payload.currency,
                    leadTimeDays: payload.leadTimeDays ?? null,
                    moq: payload.moq ?? null,
                    incoterm: payload.incoterm ?? null,
                    paymentTerms: payload.paymentTerms ?? null,
                    sampleAvail: payload.sampleAvail ?? null,
                    validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
                    status: "SUBMITTED",
                },
            });
        }
        await tx.quotationLineItem.createMany({ data: lineItemRows(q.id, payload) });
        return q;
    });
}
async function finalizeQuotationSubmit(workspaceId, supplierUserId, created, fsmActor, opts) {
    await rfqService.applyTransition({
        workspaceId,
        action: "submit_quotation",
        actor: fsmActor,
        payload: {
            quotationId: created.id,
            supplierUserId,
            total: Number(created.total),
            currency: created.currency,
            ...(opts?.submittedByAdminId ? { submittedByAdminId: opts.submittedByAdminId } : {}),
        },
    });
    const { markQuoted } = await import("../supplier-activity/supplier-activity.service.js");
    await markQuoted(workspaceId, supplierUserId);
    void (async () => {
        const { emitConversationSystemEvent } = await import("../conversation-hub/conversation-hub.hooks.js");
        emitConversationSystemEvent(prisma, "RFQ", workspaceId, "QUOTATION_SUBMITTED", supplierUserId, created.currency, { quotationId: created.id, dedupeKey: created.id });
    })();
    return await getQuotationDTO(created.id);
}
// ─── submit_quotation ────────────────────────────────────────────────────────
export async function submitQuotation(workspaceId, actor, payload) {
    if (actor.role !== "SUPPLIER")
        throw new AppError(403, "FORBIDDEN_ROLE");
    if (!(await canAccessRfq(prisma, actor, workspaceId)))
        throw new AppError(403, "FORBIDDEN");
    await assertWorkspaceOpen(workspaceId);
    const { assertSupplierQuoteLinesAllowed } = await import("../rfq/supplier-line-scope.service.js");
    await assertSupplierQuoteLinesAllowed(workspaceId, actor.id, payload);
    const existing = await findActiveQuotation(workspaceId, actor.id);
    if (existing)
        throw new AppError(409, "QUOTATION_ALREADY_SUBMITTED");
    const created = await persistSubmittedQuotation(workspaceId, actor.id, payload);
    return await finalizeQuotationSubmit(workspaceId, actor.id, created, { id: actor.id, email: actor.email, role: "SUPPLIER" });
}
// ─── admin_submit_quotation (on behalf of supplier) ──────────────────────────
export async function adminSubmitQuotation(workspaceId, adminActor, payload) {
    if (!isPlatformAdminRole(adminActor.role))
        throw new AppError(403, "FORBIDDEN_ROLE");
    if (!(await canAccessRfq(prisma, adminActor, workspaceId)))
        throw new AppError(403, "FORBIDDEN");
    await assertWorkspaceOpen(workspaceId);
    const { supplierUserId, ...quotePayload } = payload;
    await assertSupplierAssigned(workspaceId, supplierUserId);
    const fsmActor = await loadSupplierActor(supplierUserId);
    const { assertSupplierQuoteLinesAllowed } = await import("../rfq/supplier-line-scope.service.js");
    await assertSupplierQuoteLinesAllowed(workspaceId, supplierUserId, quotePayload);
    const existing = await findActiveQuotation(workspaceId, supplierUserId);
    if (existing)
        throw new AppError(409, "QUOTATION_ALREADY_SUBMITTED");
    const created = await persistSubmittedQuotation(workspaceId, supplierUserId, quotePayload);
    return await finalizeQuotationSubmit(workspaceId, supplierUserId, created, fsmActor, { submittedByAdminId: adminActor.id });
}
export async function getSupplierQuoteScopeForAdmin(workspaceId, adminActor, supplierUserId) {
    if (!isPlatformAdminRole(adminActor.role))
        throw new AppError(403, "FORBIDDEN_ROLE");
    if (!(await canAccessRfq(prisma, adminActor, workspaceId)))
        throw new AppError(403, "FORBIDDEN");
    await assertSupplierAssigned(workspaceId, supplierUserId);
    await loadSupplierActor(supplierUserId);
    const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { rfqLineItems: { select: { id: true } } },
    });
    const allLineIds = ws?.rfqLineItems.map((l) => l.id) ?? [];
    const { getAllowedQuoteLineIds } = await import("../rfq/supplier-line-scope.service.js");
    const allowedQuoteLineItemIds = await getAllowedQuoteLineIds(workspaceId, supplierUserId);
    const activeQuotation = await findActiveQuotation(workspaceId, supplierUserId);
    const quotedRows = activeQuotation
        ? await prisma.quotationLineItem.findMany({
            where: { quotationId: activeQuotation.id },
            select: { rfqLineItemId: true },
        })
        : [];
    const quotedLineItemIds = [
        ...new Set(quotedRows
            .map((r) => r.rfqLineItemId)
            .filter((id) => typeof id === "string")),
    ];
    const scopeIds = allowedQuoteLineItemIds ?? allLineIds;
    const remainingQuoteLineItemIds = scopeIds.filter((id) => !quotedLineItemIds.includes(id));
    return {
        supplierUserId,
        allowedQuoteLineItemIds,
        remainingQuoteLineItemIds: remainingQuoteLineItemIds.length ? remainingQuoteLineItemIds : null,
        quotedLineItemIds,
        existingQuotationId: activeQuotation?.id ?? null,
    };
}
// ─── revise_quotation ────────────────────────────────────────────────────────
export async function reviseQuotation(workspaceId, quotationId, actor, payload) {
    if (actor.role !== "SUPPLIER")
        throw new AppError(403, "FORBIDDEN_ROLE");
    await assertWorkspaceOpen(workspaceId);
    const existing = await prisma.quotation.findUnique({ where: { id: quotationId } });
    if (!existing || existing.workspaceId !== workspaceId)
        throw new AppError(404, "QUOTATION_NOT_FOUND");
    if (existing.supplierUserId !== actor.id)
        throw new AppError(403, "FORBIDDEN");
    if (existing.withdrawnAt)
        throw new AppError(409, "QUOTATION_WITHDRAWN");
    const { assertSupplierQuoteLinesAllowed } = await import("../rfq/supplier-line-scope.service.js");
    await assertSupplierQuoteLinesAllowed(workspaceId, actor.id, payload);
    await prisma.$transaction(async (tx) => {
        await tx.quotationLineItem.deleteMany({ where: { quotationId } });
        await tx.quotationLineItem.createMany({ data: lineItemRows(quotationId, payload) });
        await tx.quotation.update({
            where: { id: quotationId },
            data: {
                total: totalFor(payload),
                unitPriceAvg: unitPriceAvgFor(payload),
                currency: payload.currency,
                leadTimeDays: payload.leadTimeDays ?? null,
                moq: payload.moq ?? null,
                incoterm: payload.incoterm ?? null,
                paymentTerms: payload.paymentTerms ?? null,
                sampleAvail: payload.sampleAvail ?? null,
                validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
                status: "REVISED",
                revisedAt: new Date(),
            },
        });
    });
    const revised = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
    await rfqService.applyTransition({
        workspaceId,
        action: "revise_quotation",
        actor: { id: actor.id, email: actor.email, role: actor.role },
        payload: {
            quotationId,
            supplierUserId: actor.id,
            total: Number(revised.total),
            currency: revised.currency,
        },
    });
    const { markQuoted } = await import("../supplier-activity/supplier-activity.service.js");
    await markQuoted(workspaceId, actor.id);
    return await getQuotationDTO(quotationId);
}
// ─── admin_revise_quotation (on behalf of supplier) ────────────────────────────
export async function adminReviseQuotation(workspaceId, quotationId, adminActor, payload) {
    if (!isPlatformAdminRole(adminActor.role))
        throw new AppError(403, "FORBIDDEN_ROLE");
    if (!(await canAccessRfq(prisma, adminActor, workspaceId)))
        throw new AppError(403, "FORBIDDEN");
    await assertWorkspaceOpen(workspaceId);
    const { supplierUserId, ...quotePayload } = payload;
    await assertSupplierAssigned(workspaceId, supplierUserId);
    const fsmActor = await loadSupplierActor(supplierUserId);
    const existing = await prisma.quotation.findUnique({ where: { id: quotationId } });
    if (!existing || existing.workspaceId !== workspaceId)
        throw new AppError(404, "QUOTATION_NOT_FOUND");
    if (existing.supplierUserId !== supplierUserId)
        throw new AppError(403, "FORBIDDEN");
    if (existing.withdrawnAt)
        throw new AppError(409, "QUOTATION_WITHDRAWN");
    const { assertSupplierQuoteLinesAllowed } = await import("../rfq/supplier-line-scope.service.js");
    await assertSupplierQuoteLinesAllowed(workspaceId, supplierUserId, quotePayload);
    await prisma.$transaction(async (tx) => {
        await tx.quotationLineItem.deleteMany({ where: { quotationId } });
        await tx.quotationLineItem.createMany({ data: lineItemRows(quotationId, quotePayload) });
        await tx.quotation.update({
            where: { id: quotationId },
            data: {
                total: totalFor(quotePayload),
                unitPriceAvg: unitPriceAvgFor(quotePayload),
                currency: quotePayload.currency,
                leadTimeDays: quotePayload.leadTimeDays ?? null,
                moq: quotePayload.moq ?? null,
                incoterm: quotePayload.incoterm ?? null,
                paymentTerms: quotePayload.paymentTerms ?? null,
                sampleAvail: quotePayload.sampleAvail ?? null,
                validUntil: quotePayload.validUntil ? new Date(quotePayload.validUntil) : null,
                status: "REVISED",
                revisedAt: new Date(),
            },
        });
    });
    const revised = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
    await rfqService.applyTransition({
        workspaceId,
        action: "revise_quotation",
        actor: fsmActor,
        payload: {
            quotationId,
            supplierUserId,
            total: Number(revised.total),
            currency: revised.currency,
            revisedByAdminId: adminActor.id,
        },
    });
    const { markQuoted } = await import("../supplier-activity/supplier-activity.service.js");
    await markQuoted(workspaceId, supplierUserId);
    return await getQuotationDTO(quotationId);
}
// ─── withdraw_quotation ──────────────────────────────────────────────────────
export async function withdrawQuotation(workspaceId, quotationId, actor, payload) {
    if (actor.role !== "SUPPLIER")
        throw new AppError(403, "FORBIDDEN_ROLE");
    await assertWorkspaceOpen(workspaceId);
    const existing = await prisma.quotation.findUnique({ where: { id: quotationId } });
    if (!existing || existing.workspaceId !== workspaceId)
        throw new AppError(404, "QUOTATION_NOT_FOUND");
    if (existing.supplierUserId !== actor.id)
        throw new AppError(403, "FORBIDDEN");
    if (existing.withdrawnAt)
        throw new AppError(409, "QUOTATION_ALREADY_WITHDRAWN");
    await prisma.quotation.update({
        where: { id: quotationId },
        data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });
    await rfqService.applyTransition({
        workspaceId,
        action: "withdraw_quotation",
        actor: { id: actor.id, email: actor.email, role: actor.role },
        payload: { quotationId },
        reason: payload.reason,
    });
    const { markDeclined } = await import("../supplier-activity/supplier-activity.service.js");
    await markDeclined(workspaceId, actor.id, payload.reason);
    return await getQuotationDTO(quotationId);
}
// ─── DTO helper ──────────────────────────────────────────────────────────────
async function getQuotationDTO(id) {
    const q = await prisma.quotation.findUnique({
        where: { id },
        include: { lineItems: { orderBy: { position: "asc" } } },
    });
    if (!q)
        throw new AppError(404, "QUOTATION_NOT_FOUND");
    const supplier = await prisma.user.findUnique({
        where: { id: q.supplierUserId },
        select: { id: true, displayName: true, email: true,
            organisation: { select: { name: true } } },
    });
    return {
        id: q.id,
        workspaceId: q.workspaceId,
        supplierUserId: q.supplierUserId,
        supplierName: supplier?.organisation?.name ?? supplier?.displayName ?? null,
        supplierOrg: supplier?.organisation?.name ?? null,
        total: Number(q.total),
        currency: q.currency,
        leadTimeDays: q.leadTimeDays,
        moq: q.moq,
        incoterm: q.incoterm,
        paymentTerms: q.paymentTerms,
        sampleAvail: q.sampleAvail,
        validUntil: q.validUntil?.toISOString() ?? null,
        status: q.status,
        submittedAt: q.submittedAt.toISOString(),
        revisedAt: q.revisedAt?.toISOString() ?? null,
        withdrawnAt: q.withdrawnAt?.toISOString() ?? null,
        lineItems: q.lineItems.map((l) => ({
            id: l.id, position: l.position, description: l.description,
            unitPrice: Number(l.unitPrice), quantity: Number(l.quantity),
            total: Number(l.total),
            packing: l.packing ?? null,
            priceUnit: l.priceUnit ?? null,
            moq: l.moq ?? null,
        })),
    };
}
//# sourceMappingURL=quotations.service.js.map