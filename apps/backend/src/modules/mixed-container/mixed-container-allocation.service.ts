import { Prisma, PrismaClient } from "@prisma/client";
import {
  findMcTransition,
  type MixedContainerAction,
  type MixedContainerState,
} from "@dmx/contracts/mixed-container.fsm";
import type {
  CreateMcAllocationInput,
  UploadMcProformaInput,
  CreateMcPaymentInput,
  UpdateMcPaymentInput,
} from "@dmx/contracts/mixed-container.zod";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./mixed-container.policy.js";
import { toMixedContainerDTO } from "./mixed-container.service.js";

const WS_INCLUDE = {
  mixedContainerDetails: true,
  containerLines: {
    where: { removedAt: null },
    orderBy: { sortOrder: "asc" as const },
    include: { catalogProduct: { include: { category: true } }, packingType: true },
  },
  createdBy: { select: { displayName: true, organisation: { select: { name: true } } } },
};

const COORDINATION_STATES = [
  "MC_APPROVED",
  "MC_ALLOCATION_IN_PROGRESS",
  "MC_PROFORMA_PENDING",
  "MC_PAYMENT_TRACKING",
  "MC_EXECUTION_READY",
  "MC_EXECUTION_ACTIVE",
  "MC_EXECUTION_COMPLETE",
] as const;

const SUPPLIER_CODE_EMAIL: Record<string, string> = {
  "SUP-001": "supplier1@acme-mfg.test",
  "SUP-002": "supplier1@beta-industries.test",
};

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

async function applyMcTransition(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  action: MixedContainerAction,
  actor: AuthUser,
  auditEvent: string,
  payload: Record<string, unknown> = {},
) {
  await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
  const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const from = ws.state as MixedContainerState;
  const t = findMcTransition(from, action);
  if (!t) throw new AppError(400, "INVALID_TRANSITION", { from, action });
  if (!t.allowedRoles.includes(actor.role as "BUYER" | "ADMIN" | "SYSTEM")) {
    throw new AppError(403, "FORBIDDEN_ROLE");
  }
  await tx.workspace.update({ where: { id: workspaceId }, data: { state: t.to } });
  await appendTimeline(tx, workspaceId, auditEvent, actor.id, payload);
  return t.to;
}

export class MixedContainerAllocationService {
  constructor(public readonly prisma: PrismaClient) {}

  private async assertAdminMcWorkspace(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id } });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    return ws;
  }

  private async assertBuyerAccess(workspaceId: string, actor: AuthUser) {
    const part = await this.prisma.workspaceParticipant.findFirst({
      where: { workspaceId, userId: actor.id, participantRole: "OWNER" },
    });
    if (!part) throw new AppError(403, "FORBIDDEN");
  }

  async allocationKpis() {
    const counts = await this.prisma.workspace.groupBy({
      by: ["state"],
      where: { type: "MIXED_CONTAINER", state: { in: [...COORDINATION_STATES] } },
      _count: true,
    });
    const map = new Map(counts.map((c) => [c.state, c._count]));

    const paymentsPending = await this.prisma.mcPaymentRecord.count({
      where: {
        paymentStatus: { in: ["PENDING", "PAYMENT_SENT"] },
        containerRequest: { type: "MIXED_CONTAINER", state: "MC_PAYMENT_TRACKING" },
      },
    });
    const paymentsConfirmed = await this.prisma.mcPaymentRecord.count({
      where: {
        paymentStatus: "PAYMENT_CONFIRMED",
        containerRequest: { type: "MIXED_CONTAINER" },
      },
    });

    return {
      allocationsPending:
        (map.get("MC_APPROVED") ?? 0) + (map.get("MC_ALLOCATION_IN_PROGRESS") ?? 0),
      proformasPending: map.get("MC_PROFORMA_PENDING") ?? 0,
      paymentsPending,
      paymentsConfirmed,
      executionReady: map.get("MC_EXECUTION_READY") ?? 0,
    };
  }

  async allocationInbox() {
    const rows = await this.prisma.workspace.findMany({
      where: { type: "MIXED_CONTAINER", state: { in: [...COORDINATION_STATES] } },
      include: {
        containerLines: { where: { removedAt: null } },
        mcSupplierAllocations: true,
        mcSupplierProformas: true,
        mcPaymentRecords: true,
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
      productCount: ws.containerLines.length,
      allocationCount: ws.mcSupplierAllocations.length,
      proformaCount: ws.mcSupplierProformas.length,
      paymentConfirmedCount: ws.mcPaymentRecords.filter((p) => p.paymentStatus === "PAYMENT_CONFIRMED").length,
      updatedAt: ws.updatedAt.toISOString(),
    }));
  }

  async getAllocationWorkspace(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        ...WS_INCLUDE,
        mcSupplierAllocations: {
          include: {
            containerLine: { include: { catalogProduct: true } },
            proformas: true,
            payments: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        mcSupplierProformas: { orderBy: { createdAt: "asc" } },
        mcPaymentRecords: { orderBy: { createdAt: "asc" } },
      },
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    const allocatedLineIds = new Set(ws.mcSupplierAllocations.map((a) => a.containerLineId));
    const unallocatedLineIds = ws.containerLines
      .filter((l) => !allocatedLineIds.has(l.id))
      .map((l) => l.id);

    const allocMap = new Map(ws.mcSupplierAllocations.map((a) => [a.id, a]));

    return {
      container: toMixedContainerDTO(ws as Parameters<typeof toMixedContainerDTO>[0]),
      state: ws.state,
      allocations: ws.mcSupplierAllocations.map((a) => ({
        id: a.id,
        allocationRef: allocationRef(a.sortOrder),
        containerLineId: a.containerLineId,
        productId: a.productId,
        productRef: a.containerLine.catalogProduct.productRef,
        productName: a.containerLine.catalogProduct.name,
        supplierId: a.supplierId,
        supplierCode: a.supplierCode,
        allocatedPallets: a.allocatedPallets,
        allocatedQuantity: num(a.allocatedQuantity),
        expectedExwPrice: num(a.expectedExwPrice)!,
        notes: a.notes,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      proformas: ws.mcSupplierProformas.map((p) => {
        const alloc = allocMap.get(p.allocationId)!;
        return {
          id: p.id,
          allocationId: p.allocationId,
          allocationRef: allocationRef(alloc.sortOrder),
          proformaNumber: p.proformaNumber,
          supplierReference: p.supplierReference,
          issueDate: p.issueDate.toISOString(),
          dueDate: p.dueDate.toISOString(),
          currency: p.currency,
          amount: num(p.amount)!,
          documentUrl: p.documentUrl,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        };
      }),
      payments: ws.mcPaymentRecords.map((p) => {
        const alloc = allocMap.get(p.allocationId)!;
        return {
          id: p.id,
          allocationId: p.allocationId,
          allocationRef: allocationRef(alloc.sortOrder),
          amount: num(p.amount)!,
          currency: p.currency,
          paymentStatus: p.paymentStatus,
          paymentDate: p.paymentDate?.toISOString() ?? null,
          buyerReference: p.buyerReference,
          notes: p.notes,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      unallocatedLineIds,
    };
  }

  async startAllocation(id: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.assertAdminMcWorkspace(id);
    await this.prisma.$transaction(async (tx) => {
      await applyMcTransition(tx, id, "start_allocation", actor, "mixed_container.allocation_started");
    });
    return this.getAllocationWorkspace(id);
  }

  async createAllocation(id: string, input: CreateMcAllocationInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const ws = await this.assertAdminMcWorkspace(id);
    if (!["MC_ALLOCATION_IN_PROGRESS", "MC_APPROVED"].includes(ws.state)) {
      throw new AppError(409, "ALLOCATION_NOT_ALLOWED", { state: ws.state });
    }

    const line = await this.prisma.containerLine.findFirst({
      where: { id: input.containerLineId, workspaceId: id, removedAt: null },
      include: { catalogProduct: true, packingType: true },
    });
    if (!line) throw new AppError(404, "LINE_NOT_FOUND");
    if (!line.packingTypeId || !line.packingType?.isActive) {
      throw new AppError(400, "PACKING_TYPE_REQUIRED");
    }

    const existing = await this.prisma.mcSupplierAllocation.findFirst({
      where: { containerRequestId: id, containerLineId: input.containerLineId },
    });
    if (existing) throw new AppError(409, "LINE_ALREADY_ALLOCATED");

    const count = await this.prisma.mcSupplierAllocation.count({ where: { containerRequestId: id } });

    let resolvedSupplierId = input.supplierId;
    if (!resolvedSupplierId) {
      const email = SUPPLIER_CODE_EMAIL[input.supplierCode];
      if (email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        resolvedSupplierId = user?.id;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (ws.state === "MC_APPROVED") {
        await applyMcTransition(tx, id, "start_allocation", actor, "mixed_container.allocation_started");
      }
      const alloc = await tx.mcSupplierAllocation.create({
        data: {
          containerRequestId: id,
          containerLineId: input.containerLineId,
          productId: line.catalogProductId,
          supplierId: resolvedSupplierId,
          supplierCode: input.supplierCode,
          allocatedPallets: input.allocatedPallets,
          allocatedQuantity: input.allocatedQuantity,
          expectedExwPrice: input.expectedExwPrice,
          notes: input.notes,
          status: "ASSIGNED",
          sortOrder: count,
        },
      });
      await applyMcTransition(tx, id, "create_allocation", actor, "mixed_container.allocation_created", {
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
      include: { containerLines: { where: { removedAt: null } }, mcSupplierAllocations: true },
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    if (ws.state !== "MC_ALLOCATION_IN_PROGRESS") {
      throw new AppError(409, "INVALID_STATE", { state: ws.state });
    }

    const allocatedLineIds = new Set(ws.mcSupplierAllocations.map((a) => a.containerLineId));
    const unallocated = ws.containerLines.filter((l) => !allocatedLineIds.has(l.id));
    if (unallocated.length > 0) {
      throw new AppError(409, "LINES_NOT_ALLOCATED", { count: unallocated.length });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.mcSupplierAllocation.updateMany({
        where: { containerRequestId: id },
        data: { status: "PROFORMA_REQUESTED" },
      });
      await applyMcTransition(tx, id, "complete_allocations", actor, "mixed_container.allocations_completed");
    });

    return this.getAllocationWorkspace(id);
  }

  async uploadProforma(id: string, allocationId: string, input: UploadMcProformaInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const ws = await this.assertAdminMcWorkspace(id);
    if (!["MC_PROFORMA_PENDING", "MC_ALLOCATION_IN_PROGRESS"].includes(ws.state)) {
      throw new AppError(409, "PROFORMA_NOT_ALLOWED", { state: ws.state });
    }

    const alloc = await this.prisma.mcSupplierAllocation.findFirst({
      where: { id: allocationId, containerRequestId: id },
    });
    if (!alloc) throw new AppError(404, "ALLOCATION_NOT_FOUND");

    const existingProforma = await this.prisma.mcSupplierProforma.findFirst({
      where: { allocationId },
    });
    if (existingProforma) throw new AppError(409, "PROFORMA_ALREADY_EXISTS");

    await this.prisma.$transaction(async (tx) => {
      await tx.mcSupplierProforma.create({
        data: {
          allocationId,
          containerRequestId: id,
          proformaNumber: input.proformaNumber,
          supplierReference: input.supplierReference,
          issueDate: new Date(input.issueDate),
          dueDate: new Date(input.dueDate),
          currency: input.currency,
          amount: input.amount,
          documentUrl: input.documentUrl,
          status: "UPLOADED",
        },
      });
      await tx.mcSupplierAllocation.update({
        where: { id: allocationId },
        data: { status: "PROFORMA_UPLOADED" },
      });
      if (ws.state === "MC_ALLOCATION_IN_PROGRESS") {
        await applyMcTransition(tx, id, "complete_allocations", actor, "mixed_container.allocations_completed");
      }
      await applyMcTransition(tx, id, "upload_proforma", actor, "mixed_container.proforma_uploaded", {
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
      include: { mcSupplierAllocations: true, mcSupplierProformas: true },
    });
    if (ws.state !== "MC_PROFORMA_PENDING") return;
    if (ws.mcSupplierAllocations.length === 0) return;
    const proformaAllocIds = new Set(ws.mcSupplierProformas.map((p) => p.allocationId));
    const allHaveProformas = ws.mcSupplierAllocations.every((a) => proformaAllocIds.has(a.id));
    if (!allHaveProformas) return;

    await applyMcTransition(tx, id, "begin_payment_tracking", actor, "mixed_container.payment_tracking_started");

    for (const alloc of ws.mcSupplierAllocations) {
      const proforma = ws.mcSupplierProformas.find((p) => p.allocationId === alloc.id);
      if (!proforma) continue;
      const existingPayment = await tx.mcPaymentRecord.findFirst({ where: { allocationId: alloc.id } });
      if (!existingPayment) {
        await tx.mcPaymentRecord.create({
          data: {
            allocationId: alloc.id,
            containerRequestId: id,
            amount: proforma.amount,
            currency: proforma.currency,
            paymentStatus: "PENDING",
          },
        });
      }
      await tx.mcSupplierAllocation.update({
        where: { id: alloc.id },
        data: { status: "PAYMENT_PENDING" },
      });
    }
  }

  async createPayment(id: string, input: CreateMcPaymentInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.assertAdminMcWorkspace(id);

    const alloc = await this.prisma.mcSupplierAllocation.findFirst({
      where: { id: input.allocationId, containerRequestId: id },
    });
    if (!alloc) throw new AppError(404, "ALLOCATION_NOT_FOUND");

    const existing = await this.prisma.mcPaymentRecord.findFirst({
      where: { allocationId: input.allocationId },
    });
    if (existing) throw new AppError(409, "PAYMENT_ALREADY_EXISTS");

    await this.prisma.mcPaymentRecord.create({
      data: {
        allocationId: input.allocationId,
        containerRequestId: id,
        amount: input.amount,
        currency: input.currency,
        paymentStatus: "PENDING",
        buyerReference: input.buyerReference,
        notes: input.notes,
      },
    });

    return this.getAllocationWorkspace(id);
  }

  async updatePayment(id: string, paymentId: string, input: UpdateMcPaymentInput, actor: AuthUser) {
    const ws = await this.assertAdminMcWorkspace(id);
    const payment = await this.prisma.mcPaymentRecord.findFirst({
      where: { id: paymentId, containerRequestId: id },
    });
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND");

    if (actor.role === "BUYER") {
      await this.assertBuyerAccess(id, actor);
      if (input.paymentStatus !== "PAYMENT_SENT") {
        throw new AppError(403, "BUYER_PAYMENT_STATUS_LIMITED");
      }
    } else if (actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.mcPaymentRecord.update({
        where: { id: paymentId },
        data: {
          paymentStatus: input.paymentStatus,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : input.paymentStatus !== "PENDING" ? new Date() : null,
          buyerReference: input.buyerReference,
          notes: input.notes,
        },
      });

      if (input.paymentStatus === "PAYMENT_SENT") {
        await applyMcTransition(tx, id, "record_payment_sent", actor, "mixed_container.payment_sent", {
          paymentId,
          allocationId: payment.allocationId,
        });
      } else if (input.paymentStatus === "PAYMENT_CONFIRMED") {
        await tx.mcSupplierAllocation.update({
          where: { id: payment.allocationId },
          data: { status: "PAYMENT_CONFIRMED" },
        });
        await applyMcTransition(tx, id, "confirm_payment", actor, "mixed_container.payment_confirmed", {
          paymentId,
          allocationId: payment.allocationId,
        });
      }

      if (ws.state === "MC_PAYMENT_TRACKING" && input.paymentStatus === "PAYMENT_CONFIRMED") {
        await this.tryMarkExecutionReady(tx, id, actor);
      }
    });

    return this.getAllocationWorkspace(id);
  }

  private async tryMarkExecutionReady(tx: Prisma.TransactionClient, id: string, actor: AuthUser) {
    const ws = await tx.workspace.findUniqueOrThrow({
      where: { id },
      include: { mcSupplierAllocations: true, mcPaymentRecords: true },
    });
    if (ws.state !== "MC_PAYMENT_TRACKING") return;
    if (ws.mcSupplierAllocations.length === 0) return;

    const allConfirmed = ws.mcPaymentRecords.every((p) => p.paymentStatus === "PAYMENT_CONFIRMED");
    if (!allConfirmed) return;

    await applyMcTransition(tx, id, "mark_execution_ready", actor, "mixed_container.execution_ready");
  }

  async getCoordination(id: string, actor: AuthUser) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        mixedContainerDetails: true,
        containerLines: { where: { removedAt: null }, include: { catalogProduct: true, packingType: true } },
        mcSupplierAllocations: {
          include: { containerLine: { include: { catalogProduct: true } } },
          orderBy: { sortOrder: "asc" },
        },
        mcSupplierProformas: { orderBy: { createdAt: "asc" } },
        mcPaymentRecords: { orderBy: { createdAt: "asc" } },
        timelineEvents: { orderBy: { createdAt: "asc" }, take: 100 },
      },
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    if (actor.role === "BUYER") {
      await this.assertBuyerAccess(id, actor);
    } else if (actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }

    const allocMap = new Map(ws.mcSupplierAllocations.map((a) => [a.id, a]));
    const productName = (allocId: string) => {
      const a = allocMap.get(allocId);
      return a?.containerLine.catalogProduct.name ?? "Product";
    };

    const timelineEvents = ws.timelineEvents;
    const eventAt = (type: string) =>
      timelineEvents.find((e) => e.eventType === type)?.createdAt.toISOString() ?? null;

    const timeline = [
      { key: "offer_approved", label: "Offer Approved", completed: !!eventAt("mixed_container.offer_approved"), completedAt: eventAt("mixed_container.offer_approved") },
      { key: "allocations_created", label: "Allocations Created", completed: !!eventAt("mixed_container.allocation_created"), completedAt: eventAt("mixed_container.allocation_created") },
      { key: "proformas_available", label: "Proformas Available", completed: !!eventAt("mixed_container.proforma_uploaded"), completedAt: eventAt("mixed_container.proforma_uploaded") },
      { key: "payments_pending", label: "Payments Pending", completed: !!eventAt("mixed_container.payment_tracking_started"), completedAt: eventAt("mixed_container.payment_tracking_started") },
      { key: "payments_confirmed", label: "Payments Confirmed", completed: !!eventAt("mixed_container.payment_confirmed"), completedAt: eventAt("mixed_container.payment_confirmed") },
      { key: "execution_ready", label: "Execution Ready", completed: ws.state === "MC_EXECUTION_READY", completedAt: eventAt("mixed_container.execution_ready") },
    ];

    return {
      workspaceId: ws.id,
      externalRef: ws.externalRef,
      state: ws.state,
      allocations: ws.mcSupplierAllocations.map((a) => ({
        id: a.id,
        allocationRef: allocationRef(a.sortOrder),
        productRef: a.containerLine.catalogProduct.productRef,
        productName: a.containerLine.catalogProduct.name,
        packaging: a.containerLine.catalogProduct.packagingDescription,
        allocatedPallets: a.allocatedPallets,
        allocatedQuantity: num(a.allocatedQuantity),
        expectedExwPrice: num(a.expectedExwPrice)!,
        status: a.status,
      })),
      proformas: ws.mcSupplierProformas.map((p) => ({
        id: p.id,
        allocationRef: allocationRef(allocMap.get(p.allocationId)!.sortOrder),
        productName: productName(p.allocationId),
        proformaNumber: p.proformaNumber,
        issueDate: p.issueDate.toISOString(),
        dueDate: p.dueDate.toISOString(),
        currency: p.currency,
        amount: num(p.amount)!,
        documentUrl: p.documentUrl,
        status: p.status,
      })),
      payments: ws.mcPaymentRecords.map((p) => ({
        id: p.id,
        allocationRef: allocationRef(allocMap.get(p.allocationId)!.sortOrder),
        productName: productName(p.allocationId),
        amount: num(p.amount)!,
        currency: p.currency,
        paymentStatus: p.paymentStatus,
        paymentDate: p.paymentDate?.toISOString() ?? null,
        buyerReference: p.buyerReference,
      })),
      timeline,
    };
  }

  async reviewProforma(id: string, proformaId: string, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN");
    await this.assertBuyerAccess(id, actor);

    const proforma = await this.prisma.mcSupplierProforma.findFirst({
      where: { id: proformaId, containerRequestId: id },
    });
    if (!proforma) throw new AppError(404, "PROFORMA_NOT_FOUND");

    await this.prisma.mcSupplierProforma.update({
      where: { id: proformaId },
      data: { status: "BUYER_REVIEWED" },
    });

    return this.getCoordination(id, actor);
  }
}
