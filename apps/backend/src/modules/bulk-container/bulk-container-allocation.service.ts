import { Prisma, PrismaClient } from "@prisma/client";
import {
  findBcTransition,
  type BulkContainerAction,
  type BulkContainerState,
} from "@dmx/contracts/bulk-container.fsm";
import type {
  CreateBcAllocationInput,
  UploadBcProformaInput,
  UpdateBcPaymentInput,
} from "@dmx/contracts/bulk-container.zod";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./bulk-container.policy.js";
import { toBulkContainerDTO } from "./bulk-container.service.js";

const WS_INCLUDE = {
  bulkContainerDetails: true,
  bulkContainerLines: {
    where: { removedAt: null },
    orderBy: { sortOrder: "asc" as const },
    include: {
      catalogProduct: { include: { category: true, specTemplate: true } },
      packingType: true,
    },
  },
  createdBy: { select: { displayName: true, organisation: { select: { name: true } } } },
};

const COORDINATION_STATES = [
  "BC_APPROVED",
  "BC_ALLOCATION_IN_PROGRESS",
  "BC_PROFORMA_PENDING",
  "BC_PAYMENT_TRACKING",
  "BC_EXECUTION_READY",
  "BC_EXECUTION_ACTIVE",
  "BC_EXECUTION_COMPLETE",
] as const;

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function allocationRef(sortOrder: number): string {
  return `Allocation ${sortOrder + 1}`;
}

async function appendTimeline(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  eventType: string,
  actorUserId: string | null,
  payload: Record<string, unknown> = {},
) {
  await tx.timelineEvent.create({
    data: { workspaceId, eventType, actorUserId, payload: payload as Prisma.InputJsonValue },
  });
}

async function applyBcTransition(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  action: BulkContainerAction,
  actor: AuthUser,
  auditEvent: string,
  payload: Record<string, unknown> = {},
) {
  await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
  const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const from = ws.state as BulkContainerState;
  const t = findBcTransition(from, action);
  if (!t) throw new AppError(400, "INVALID_TRANSITION", { from, action });
  if (!t.allowedRoles.includes(actor.role as "BUYER" | "ADMIN" | "SYSTEM")) {
    throw new AppError(403, "FORBIDDEN_ROLE");
  }
  await tx.workspace.update({ where: { id: workspaceId }, data: { state: t.to } });
  await appendTimeline(
    tx,
    workspaceId,
    auditEvent,
    actor.role === "SYSTEM" ? null : actor.id,
    payload,
  );
  return t.to;
}

export class BulkContainerAllocationService {
  constructor(public readonly prisma: PrismaClient) {}

  private async assertAdminBcWorkspace(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id } });
    if (ws.type !== "BULK_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    return ws;
  }

  private async assertBuyerAccess(workspaceId: string, actor: AuthUser) {
    const part = await this.prisma.workspaceParticipant.findFirst({
      where: { workspaceId, userId: actor.id, participantRole: "OWNER" },
    });
    if (!part) throw new AppError(403, "FORBIDDEN");
  }

  private lineFullyAllocated(
    lineId: string,
    lineQtyMt: number,
    allocations: Array<{ lineId: string; allocatedQuantityMt: Prisma.Decimal }>,
  ): boolean {
    const total = allocations
      .filter((a) => a.lineId === lineId)
      .reduce((sum, a) => sum + Number(a.allocatedQuantityMt), 0);
    return total >= lineQtyMt - 0.001;
  }

  async allocationKpis() {
    const counts = await this.prisma.workspace.groupBy({
      by: ["state"],
      where: { type: "BULK_CONTAINER", state: { in: [...COORDINATION_STATES] } },
      _count: true,
    });
    const map = new Map(counts.map((c) => [c.state, c._count]));

    const paymentsPending = await this.prisma.bcPaymentRecord.count({
      where: {
        status: "PAYMENT_PENDING",
        workspace: { type: "BULK_CONTAINER", state: "BC_PAYMENT_TRACKING" },
      },
    });
    const paymentsConfirmed = await this.prisma.bcPaymentRecord.count({
      where: {
        status: "PAYMENT_CONFIRMED",
        workspace: { type: "BULK_CONTAINER" },
      },
    });

    return {
      allocationsPending:
        (map.get("BC_APPROVED") ?? 0) + (map.get("BC_ALLOCATION_IN_PROGRESS") ?? 0),
      proformasPending: map.get("BC_PROFORMA_PENDING") ?? 0,
      paymentsPending,
      paymentsConfirmed,
      executionReady: map.get("BC_EXECUTION_READY") ?? 0,
    };
  }

  async allocationInbox() {
    const rows = await this.prisma.workspace.findMany({
      where: { type: "BULK_CONTAINER", state: { in: [...COORDINATION_STATES] } },
      include: {
        bulkContainerLines: { where: { removedAt: null } },
        bcSupplierAllocations: true,
        bcSupplierProformas: true,
        bcPaymentRecords: true,
        createdBy: { select: { displayName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return rows.map((ws) => ({
      id: ws.id,
      externalRef: ws.externalRef,
      state: ws.state,
      buyerName: ws.createdBy.displayName,
      productCount: ws.bulkContainerLines.length,
      allocationCount: ws.bcSupplierAllocations.length,
      proformaCount: ws.bcSupplierProformas.length,
      paymentConfirmedCount: ws.bcPaymentRecords.filter((p) => p.status === "PAYMENT_CONFIRMED").length,
      updatedAt: ws.updatedAt.toISOString(),
    }));
  }

  async getAllocationWorkspace(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        ...WS_INCLUDE,
        bcSupplierAllocations: {
          include: {
            line: { include: { catalogProduct: true, packingType: true } },
            proformas: true,
            payments: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        bcSupplierProformas: { orderBy: { uploadedAt: "asc" } },
        bcPaymentRecords: { orderBy: { createdAt: "asc" } },
      },
    });
    if (ws.type !== "BULK_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    const unallocatedLines = ws.bulkContainerLines
      .filter((l) => !this.lineFullyAllocated(l.id, Number(l.quantityMt), ws.bcSupplierAllocations))
      .map((l) => ({
        id: l.id,
        productRef: l.catalogProduct.productRef,
        productName: l.catalogProduct.name,
        quantityMt: Number(l.quantityMt),
        allocatedMt: ws.bcSupplierAllocations
          .filter((a) => a.lineId === l.id)
          .reduce((s, a) => s + Number(a.allocatedQuantityMt), 0),
      }));

    const allocMap = new Map(ws.bcSupplierAllocations.map((a) => [a.id, a]));

    return {
      container: toBulkContainerDTO(ws as Parameters<typeof toBulkContainerDTO>[0]),
      state: ws.state,
      allocations: ws.bcSupplierAllocations.map((a) => ({
        id: a.id,
        allocationRef: allocationRef(a.sortOrder),
        lineId: a.lineId,
        productRef: a.line.catalogProduct.productRef,
        productName: a.line.catalogProduct.name,
        packingType: a.line.packingType.name,
        supplierCode: a.supplierCode,
        allocatedQuantityMt: num(a.allocatedQuantityMt)!,
        allocationStatus: a.allocationStatus,
        notes: a.notes,
        createdAt: a.createdAt.toISOString(),
      })),
      proformas: ws.bcSupplierProformas.map((p) => {
        const alloc = allocMap.get(p.allocationId)!;
        return {
          id: p.id,
          allocationId: p.allocationId,
          allocationRef: allocationRef(alloc.sortOrder),
          supplierCode: p.supplierCode,
          proformaNumber: p.proformaNumber,
          proformaFileUrl: p.proformaFileUrl,
          amount: num(p.amount)!,
          currency: p.currency,
          uploadedAt: p.uploadedAt.toISOString(),
        };
      }),
      payments: ws.bcPaymentRecords.map((p) => {
        const alloc = allocMap.get(p.allocationId)!;
        return {
          id: p.id,
          allocationId: p.allocationId,
          allocationRef: allocationRef(alloc.sortOrder),
          supplierCode: p.supplierCode,
          amount: num(p.amount)!,
          currency: p.currency,
          status: p.status,
          paymentReference: p.paymentReference,
          confirmedAt: p.confirmedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        };
      }),
      unallocatedLines,
    };
  }

  async startAllocation(id: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.assertAdminBcWorkspace(id);
    await this.prisma.$transaction(async (tx) => {
      await applyBcTransition(tx, id, "start_allocation", actor, "bulk_allocation_started");
    });
    return this.getAllocationWorkspace(id);
  }

  async createAllocation(id: string, input: CreateBcAllocationInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const ws = await this.assertAdminBcWorkspace(id);
    if (!["BC_ALLOCATION_IN_PROGRESS", "BC_APPROVED"].includes(ws.state)) {
      throw new AppError(409, "ALLOCATION_NOT_ALLOWED", { state: ws.state });
    }

    const line = await this.prisma.bulkContainerLine.findFirst({
      where: { id: input.lineId, workspaceId: id, removedAt: null },
      include: { catalogProduct: true, packingType: true },
    });
    if (!line) throw new AppError(404, "LINE_NOT_FOUND");

    const existing = await this.prisma.bcSupplierAllocation.findMany({
      where: { workspaceId: id, lineId: input.lineId },
    });
    const alreadyAllocated = existing.reduce((s, a) => s + Number(a.allocatedQuantityMt), 0);
    if (alreadyAllocated + input.allocatedQuantityMt > Number(line.quantityMt) + 0.001) {
      throw new AppError(409, "ALLOCATION_EXCEEDS_LINE_QTY");
    }

    const count = await this.prisma.bcSupplierAllocation.count({ where: { workspaceId: id } });

    await this.prisma.$transaction(async (tx) => {
      if (ws.state === "BC_APPROVED") {
        await applyBcTransition(tx, id, "start_allocation", actor, "bulk_allocation_started");
      }
      const alloc = await tx.bcSupplierAllocation.create({
        data: {
          workspaceId: id,
          lineId: input.lineId,
          supplierCode: input.supplierCode,
          allocatedQuantityMt: input.allocatedQuantityMt,
          notes: input.notes,
          allocationStatus: "ASSIGNED",
          sortOrder: count,
        },
      });
      await applyBcTransition(tx, id, "create_allocation", actor, "bulk_allocation_created", {
        allocationId: alloc.id,
        productRef: line.catalogProduct.productRef,
      });
    });

    return this.getAllocationWorkspace(id);
  }

  async completeAllocations(id: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: { bulkContainerLines: { where: { removedAt: null } }, bcSupplierAllocations: true },
    });
    if (ws.type !== "BULK_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    if (ws.state !== "BC_ALLOCATION_IN_PROGRESS") {
      throw new AppError(409, "INVALID_STATE", { state: ws.state });
    }

    const incomplete = ws.bulkContainerLines.filter(
      (l) => !this.lineFullyAllocated(l.id, Number(l.quantityMt), ws.bcSupplierAllocations),
    );
    if (incomplete.length > 0) {
      throw new AppError(409, "LINES_NOT_ALLOCATED", { count: incomplete.length });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bcSupplierAllocation.updateMany({
        where: { workspaceId: id },
        data: { allocationStatus: "PROFORMA_REQUESTED" },
      });
      await applyBcTransition(tx, id, "complete_allocations", actor, "bulk_allocations_completed");
    });

    return this.getAllocationWorkspace(id);
  }

  async uploadProforma(id: string, allocationId: string, input: UploadBcProformaInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const ws = await this.assertAdminBcWorkspace(id);
    if (!["BC_PROFORMA_PENDING", "BC_ALLOCATION_IN_PROGRESS"].includes(ws.state)) {
      throw new AppError(409, "PROFORMA_NOT_ALLOWED", { state: ws.state });
    }

    const alloc = await this.prisma.bcSupplierAllocation.findFirst({
      where: { id: allocationId, workspaceId: id },
    });
    if (!alloc) throw new AppError(404, "ALLOCATION_NOT_FOUND");

    const existingProforma = await this.prisma.bcSupplierProforma.findFirst({
      where: { allocationId },
    });
    if (existingProforma) throw new AppError(409, "PROFORMA_ALREADY_EXISTS");

    await this.prisma.$transaction(async (tx) => {
      await tx.bcSupplierProforma.create({
        data: {
          allocationId,
          workspaceId: id,
          supplierCode: alloc.supplierCode,
          proformaNumber: input.proformaNumber,
          proformaFileUrl: input.proformaFileUrl,
          amount: input.amount,
          currency: input.currency,
        },
      });
      await tx.bcSupplierAllocation.update({
        where: { id: allocationId },
        data: { allocationStatus: "PROFORMA_UPLOADED" },
      });
      if (ws.state === "BC_ALLOCATION_IN_PROGRESS") {
        await applyBcTransition(tx, id, "complete_allocations", actor, "bulk_allocations_completed");
      }
      await applyBcTransition(tx, id, "upload_proforma", actor, "bulk_proforma_uploaded", {
        allocationId,
        proformaNumber: input.proformaNumber,
      });
      await this.tryBeginPaymentTracking(tx, id, actor);
    });

    return this.getAllocationWorkspace(id);
  }

  private async tryBeginPaymentTracking(tx: Prisma.TransactionClient, id: string, actor: AuthUser) {
    const ws = await tx.workspace.findUniqueOrThrow({
      where: { id },
      include: { bcSupplierAllocations: true, bcSupplierProformas: true },
    });
    if (ws.state !== "BC_PROFORMA_PENDING") return;
    if (ws.bcSupplierAllocations.length === 0) return;
    const proformaAllocIds = new Set(ws.bcSupplierProformas.map((p) => p.allocationId));
    const allHaveProformas = ws.bcSupplierAllocations.every((a) => proformaAllocIds.has(a.id));
    if (!allHaveProformas) return;

    await applyBcTransition(tx, id, "begin_payment_tracking", actor, "bulk_payment_tracking_started");

    for (const alloc of ws.bcSupplierAllocations) {
      const proforma = ws.bcSupplierProformas.find((p) => p.allocationId === alloc.id);
      if (!proforma) continue;
      const existingPayment = await tx.bcPaymentRecord.findFirst({ where: { allocationId: alloc.id } });
      if (!existingPayment) {
        await tx.bcPaymentRecord.create({
          data: {
            allocationId: alloc.id,
            workspaceId: id,
            supplierCode: alloc.supplierCode,
            amount: proforma.amount,
            currency: proforma.currency,
            status: "PAYMENT_PENDING",
          },
        });
        await applyBcTransition(tx, id, "create_payment_record", actor, "bulk_payment_record_created", {
          allocationId: alloc.id,
        });
      }
      await tx.bcSupplierAllocation.update({
        where: { id: alloc.id },
        data: { allocationStatus: "PAYMENT_PENDING" },
      });
    }
  }

  async updatePayment(id: string, paymentId: string, input: UpdateBcPaymentInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const ws = await this.assertAdminBcWorkspace(id);
    const payment = await this.prisma.bcPaymentRecord.findFirst({
      where: { id: paymentId, workspaceId: id },
    });
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND");

    await this.prisma.$transaction(async (tx) => {
      await tx.bcPaymentRecord.update({
        where: { id: paymentId },
        data: {
          status: input.status,
          paymentReference: input.paymentReference,
          confirmedAt: input.status === "PAYMENT_CONFIRMED" ? new Date() : null,
        },
      });

      if (input.status === "PAYMENT_CONFIRMED") {
        await tx.bcSupplierAllocation.update({
          where: { id: payment.allocationId },
          data: { allocationStatus: "PAYMENT_CONFIRMED" },
        });
        await applyBcTransition(tx, id, "confirm_payment", actor, "bulk_payment_confirmed", {
          paymentId,
          allocationId: payment.allocationId,
        });
      } else if (input.status === "PAYMENT_REJECTED") {
        await applyBcTransition(tx, id, "reject_payment", actor, "bulk_payment_rejected", {
          paymentId,
          allocationId: payment.allocationId,
        });
      }

      if (ws.state === "BC_PAYMENT_TRACKING" && input.status === "PAYMENT_CONFIRMED") {
        await this.tryMarkExecutionReady(tx, id, actor);
      }
    });

    return this.getAllocationWorkspace(id);
  }

  private async tryMarkExecutionReady(tx: Prisma.TransactionClient, id: string, actor: AuthUser) {
    const ws = await tx.workspace.findUniqueOrThrow({
      where: { id },
      include: { bcSupplierAllocations: true, bcPaymentRecords: true },
    });
    if (ws.state !== "BC_PAYMENT_TRACKING") return;
    if (ws.bcSupplierAllocations.length === 0) return;

    const allConfirmed = ws.bcPaymentRecords.every((p) => p.status === "PAYMENT_CONFIRMED");
    if (!allConfirmed) return;

    await applyBcTransition(tx, id, "mark_execution_ready", actor, "bulk_execution_ready");
  }

  async getCoordination(id: string, actor: AuthUser) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        bulkContainerDetails: true,
        bulkContainerLines: { where: { removedAt: null }, include: { catalogProduct: true, packingType: true } },
        bcSupplierAllocations: {
          include: { line: { include: { catalogProduct: true, packingType: true } }, proformas: true, payments: true },
          orderBy: { sortOrder: "asc" },
        },
        bcSupplierProformas: { orderBy: { uploadedAt: "asc" } },
        bcPaymentRecords: { orderBy: { createdAt: "asc" } },
        timelineEvents: { orderBy: { createdAt: "asc" }, take: 100 },
      },
    });
    if (ws.type !== "BULK_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    if (actor.role === "BUYER") {
      await this.assertBuyerAccess(id, actor);
    } else if (actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }

    const allocMap = new Map(ws.bcSupplierAllocations.map((a) => [a.id, a]));
    const proformaByAlloc = new Map(ws.bcSupplierProformas.map((p) => [p.allocationId, p]));
    const paymentByAlloc = new Map(ws.bcPaymentRecords.map((p) => [p.allocationId, p]));

    const timelineEvents = ws.timelineEvents;
    const eventAt = (type: string) =>
      timelineEvents.find((e) => e.eventType === type)?.createdAt.toISOString() ?? null;

    const timeline = [
      { key: "offer_approved", label: "Offer Approved", completed: !!eventAt("bulk_offer_approved"), completedAt: eventAt("bulk_offer_approved") },
      { key: "allocations_created", label: "Allocations Created", completed: !!eventAt("bulk_allocation_created"), completedAt: eventAt("bulk_allocation_created") },
      { key: "proformas_available", label: "Proformas Available", completed: !!eventAt("bulk_proforma_uploaded"), completedAt: eventAt("bulk_proforma_uploaded") },
      { key: "payments_pending", label: "Payments Pending", completed: !!eventAt("bulk_payment_tracking_started"), completedAt: eventAt("bulk_payment_tracking_started") },
      { key: "payments_confirmed", label: "Payments Confirmed", completed: !!eventAt("bulk_payment_confirmed"), completedAt: eventAt("bulk_payment_confirmed") },
      { key: "execution_ready", label: "Execution Ready", completed: ws.state === "BC_EXECUTION_READY", completedAt: eventAt("bulk_execution_ready") },
    ];

    return {
      workspaceId: ws.id,
      externalRef: ws.externalRef,
      state: ws.state,
      executionReady: ws.state === "BC_EXECUTION_READY",
      allocations: ws.bcSupplierAllocations.map((a) => ({
        id: a.id,
        allocationRef: allocationRef(a.sortOrder),
        productName: a.line.catalogProduct.name,
        packingType: a.line.packingType.name,
        allocatedQuantityMt: num(a.allocatedQuantityMt)!,
        allocationStatus: a.allocationStatus,
        proformaReceived: proformaByAlloc.has(a.id),
        paymentStatus: paymentByAlloc.get(a.id)?.status ?? null,
      })),
      proformas: ws.bcSupplierProformas.map((p) => ({
        id: p.id,
        allocationRef: allocationRef(allocMap.get(p.allocationId)!.sortOrder),
        productName: allocMap.get(p.allocationId)!.line.catalogProduct.name,
        proformaNumber: p.proformaNumber,
        amount: num(p.amount)!,
        currency: p.currency,
        proformaFileUrl: p.proformaFileUrl,
        uploadedAt: p.uploadedAt.toISOString(),
      })),
      payments: ws.bcPaymentRecords.map((p) => ({
        id: p.id,
        allocationRef: allocationRef(allocMap.get(p.allocationId)!.sortOrder),
        productName: allocMap.get(p.allocationId)!.line.catalogProduct.name,
        amount: num(p.amount)!,
        currency: p.currency,
        status: p.status,
        paymentReference: p.paymentReference,
        confirmedAt: p.confirmedAt?.toISOString() ?? null,
      })),
      timeline,
    };
  }
}
