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
import { canAccessRfq, type AuthUser } from "../rfq/rfq.policy.js";
import type {
  SubmitQuotationPayload, ReviseQuotationPayload, WithdrawQuotationPayload,
} from "@dmx/contracts/rfq.zod";

const rfqService = new RfqService(prisma);

// ─── Shared helpers ──────────────────────────────────────────────────────────
function lineItemRows(quotationId: string, payload: SubmitQuotationPayload) {
  return payload.lineItems.map((li) => ({
    quotationId,
    rfqLineItemId: li.rfqLineItemId ?? null,
    position:      li.position,
    description:   li.description,
    quantity:      new Prisma.Decimal(li.quantity),
    unitPrice:     new Prisma.Decimal(li.unitPrice),
    total:         new Prisma.Decimal(li.quantity * li.unitPrice),
  }));
}

function totalFor(payload: SubmitQuotationPayload): Prisma.Decimal {
  const t = payload.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  return new Prisma.Decimal(t);
}

function unitPriceAvgFor(payload: SubmitQuotationPayload): number | null {
  let qty = 0;
  let val = 0;
  for (const li of payload.lineItems) {
    qty += li.quantity;
    val += li.quantity * li.unitPrice;
  }
  return qty > 0 ? val / qty : null;
}

async function assertWorkspaceOpen(workspaceId: string): Promise<void> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) throw new AppError(404, "RFQ_NOT_FOUND");
  if (ws.state !== "RFQ_OPEN") throw new AppError(409, "RFQ_NOT_OPEN");
}

async function findActiveQuotation(workspaceId: string, supplierId: string) {
  return await prisma.quotation.findFirst({
    where:   { workspaceId, supplierUserId: supplierId, withdrawnAt: null },
    orderBy: { submittedAt: "desc" },
  });
}

// ─── submit_quotation ────────────────────────────────────────────────────────
export async function submitQuotation(
  workspaceId: string,
  actor: AuthUser,
  payload: SubmitQuotationPayload,
) {
  if (actor.role !== "SUPPLIER") throw new AppError(403, "FORBIDDEN_ROLE");
  if (!(await canAccessRfq(prisma, actor, workspaceId))) throw new AppError(403, "FORBIDDEN");
  await assertWorkspaceOpen(workspaceId);

  const existing = await findActiveQuotation(workspaceId, actor.id);
  if (existing) throw new AppError(409, "QUOTATION_ALREADY_SUBMITTED");

  // A withdrawn quotation row may still exist for this (workspace, supplier).
  // Since the DB has @@unique([workspaceId, supplierUserId]), we re-activate
  // that row rather than creating a new one.
  const withdrawn = await prisma.quotation.findFirst({
    where: { workspaceId, supplierUserId: actor.id, withdrawnAt: { not: null } },
  });

  const created = await prisma.$transaction(async (tx) => {
    let q;
    if (withdrawn) {
      await tx.quotationLineItem.deleteMany({ where: { quotationId: withdrawn.id } });
      q = await tx.quotation.update({
        where: { id: withdrawn.id },
        data: {
          total:         totalFor(payload),
          unitPriceAvg:  unitPriceAvgFor(payload),
          currency:      payload.currency,
          leadTimeDays:  payload.leadTimeDays ?? null,
          moq:           payload.moq          ?? null,
          incoterm:      payload.incoterm     ?? null,
          paymentTerms:  payload.paymentTerms ?? null,
          sampleAvail:   payload.sampleAvail  ?? null,
          validUntil:    payload.validUntil ? new Date(payload.validUntil) : null,
          status:        "SUBMITTED",
          submittedAt:   new Date(),
          withdrawnAt:   null,
          revisedAt:     null,
        },
      });
    } else {
      q = await tx.quotation.create({
        data: {
          workspaceId,
          supplierUserId: actor.id,
          total:         totalFor(payload),
          unitPriceAvg:  unitPriceAvgFor(payload),
          currency:      payload.currency,
          leadTimeDays:  payload.leadTimeDays ?? null,
          moq:           payload.moq          ?? null,
          incoterm:      payload.incoterm     ?? null,
          paymentTerms:  payload.paymentTerms ?? null,
          sampleAvail:   payload.sampleAvail  ?? null,
          validUntil:    payload.validUntil ? new Date(payload.validUntil) : null,
          status:        "SUBMITTED",
        },
      });
    }
    await tx.quotationLineItem.createMany({ data: lineItemRows(q.id, payload) });
    return q;
  });

  // Fire the FSM self-loop so notifications + timeline + audit + sockets land.
  await rfqService.applyTransition({
    workspaceId,
    action:      "submit_quotation",
    actor:       { id: actor.id, email: actor.email, role: actor.role },
    payload:     {
      quotationId: created.id,
      supplierUserId: actor.id,
      total: Number(created.total),
      currency: created.currency,
    },
  });

  const { markQuoted } = await import("../supplier-activity/supplier-activity.service.js");
  await markQuoted(workspaceId, actor.id);

  return await getQuotationDTO(created.id);
}

// ─── revise_quotation ────────────────────────────────────────────────────────
export async function reviseQuotation(
  workspaceId: string,
  quotationId: string,
  actor: AuthUser,
  payload: ReviseQuotationPayload,
) {
  if (actor.role !== "SUPPLIER") throw new AppError(403, "FORBIDDEN_ROLE");
  await assertWorkspaceOpen(workspaceId);

  const existing = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!existing || existing.workspaceId !== workspaceId) throw new AppError(404, "QUOTATION_NOT_FOUND");
  if (existing.supplierUserId !== actor.id) throw new AppError(403, "FORBIDDEN");
  if (existing.withdrawnAt) throw new AppError(409, "QUOTATION_WITHDRAWN");

  await prisma.$transaction(async (tx) => {
    await tx.quotationLineItem.deleteMany({ where: { quotationId } });
    await tx.quotationLineItem.createMany({ data: lineItemRows(quotationId, payload) });
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        total:        totalFor(payload),
        unitPriceAvg: unitPriceAvgFor(payload),
        currency:     payload.currency,
        leadTimeDays: payload.leadTimeDays ?? null,
        moq:          payload.moq          ?? null,
        incoterm:     payload.incoterm     ?? null,
        paymentTerms: payload.paymentTerms ?? null,
        sampleAvail:  payload.sampleAvail  ?? null,
        validUntil:   payload.validUntil ? new Date(payload.validUntil) : null,
        status:       "REVISED",
        revisedAt:    new Date(),
      },
    });
  });

  const revised = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  await rfqService.applyTransition({
    workspaceId,
    action:      "revise_quotation",
    actor:       { id: actor.id, email: actor.email, role: actor.role },
    payload:     {
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

// ─── withdraw_quotation ──────────────────────────────────────────────────────
export async function withdrawQuotation(
  workspaceId: string,
  quotationId: string,
  actor: AuthUser,
  payload: WithdrawQuotationPayload,
) {
  if (actor.role !== "SUPPLIER") throw new AppError(403, "FORBIDDEN_ROLE");
  await assertWorkspaceOpen(workspaceId);

  const existing = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!existing || existing.workspaceId !== workspaceId) throw new AppError(404, "QUOTATION_NOT_FOUND");
  if (existing.supplierUserId !== actor.id) throw new AppError(403, "FORBIDDEN");
  if (existing.withdrawnAt) throw new AppError(409, "QUOTATION_ALREADY_WITHDRAWN");

  await prisma.quotation.update({
    where: { id: quotationId },
    data:  { status: "WITHDRAWN", withdrawnAt: new Date() },
  });

  await rfqService.applyTransition({
    workspaceId,
    action:      "withdraw_quotation",
    actor:       { id: actor.id, email: actor.email, role: actor.role },
    payload:     { quotationId },
    reason:      payload.reason,
  });

  const { markDeclined } = await import("../supplier-activity/supplier-activity.service.js");
  await markDeclined(workspaceId, actor.id, payload.reason);

  return await getQuotationDTO(quotationId);
}

// ─── DTO helper ──────────────────────────────────────────────────────────────
async function getQuotationDTO(id: string) {
  const q = await prisma.quotation.findUnique({
    where:   { id },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!q) throw new AppError(404, "QUOTATION_NOT_FOUND");
  const supplier = await prisma.user.findUnique({
    where: { id: q.supplierUserId },
    select: { id: true, displayName: true, email: true,
              organisation: { select: { name: true } } },
  });
  return {
    id: q.id,
    workspaceId:    q.workspaceId,
    supplierUserId: q.supplierUserId,
    supplierName:   supplier?.displayName ?? null,
    supplierOrg:    supplier?.organisation?.name ?? null,
    total:          Number(q.total),
    currency:       q.currency,
    leadTimeDays:   q.leadTimeDays,
    moq:            q.moq,
    incoterm:       q.incoterm,
    paymentTerms:   q.paymentTerms,
    sampleAvail:    q.sampleAvail,
    validUntil:     q.validUntil?.toISOString() ?? null,
    status:         q.status,
    submittedAt:    q.submittedAt.toISOString(),
    revisedAt:      q.revisedAt?.toISOString() ?? null,
    withdrawnAt:    q.withdrawnAt?.toISOString() ?? null,
    lineItems:      q.lineItems.map((l) => ({
      id: l.id, position: l.position, description: l.description,
      unitPrice: Number(l.unitPrice), quantity: Number(l.quantity),
      total: Number(l.total),
    })),
  };
}
