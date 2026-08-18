import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PoAction,
  PurchaseOrderRevision,
  PurchaseOrderSummary,
  PoDashboardMetrics,
  PurchaseOrderSource,
  PurchaseOrderListResponse,
} from "@dmx/contracts/purchase-order";
import {
  canonicalizePurchaseOrderSource,
  resolveCurrentRevisionNumber,
} from "@dmx/contracts/purchase-order";
import { canonicalizePurchaseOrderStatus } from "@dmx/contracts/purchase-order.fsm";
import type { PurchaseOrderListQuery } from "@dmx/contracts/purchase-order.zod";
import {
  AcknowledgePoPayload,
  ApproveAmendmentPayload,
  ApprovePoPayload,
  CancelPoPayload,
  ClosePoPayload,
  CompletePoPayload,
  RejectAmendmentPayload,
  RequestAmendmentPayload,
  StartExecutionPayload,
  SubmitPoPayload,
  UpdateDraftPurchaseOrderSchema,
} from "@dmx/contracts/purchase-order.zod";
import type { UpdateDraftPurchaseOrderInput } from "@dmx/contracts/purchase-order.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { AlertKey } from "@dmx/contracts/control-tower";
import { socketBus } from "../../realtime/socket-bus.js";
import { AppError } from "../../utils/httpErrors.js";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
import {
  assertAcknowledgeAllowed,
  assertAmendmentAllowed,
  assertApproveAllowed,
  assertCancelAllowed,
  assertCloseAllowed,
  assertCompleteAllowed,
  assertDraftEditAllowed,
  assertPoActionRole,
  assertStartExecutionAllowed,
  assertSubmitAllowed,
  assertVersionMatch,
  canAccessPo,
  type AuthUser,
} from "./purchase-order.policy.js";
import { notifyPoEvent } from "./purchase-order.notifications.js";
import { autoAcknowledgePoOnSupplierConfirm } from "./purchase-order.sync.js";
import {
  createPurchaseOrderForOrderTx,
  type CreatePurchaseOrderInput,
} from "./purchase-order.create.js";
import {
  emptyBySource,
  listPurchaseOrders,
} from "./purchase-order.list.js";

export class PurchaseOrderService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Reusable domain creation (Sprint 27). Runs in its own transaction.
   * Prefer createPurchaseOrderOnOrderSpawn when already inside an outer tx.
   */
  async createForOrder(
    input: Omit<CreatePurchaseOrderInput, "actorUserId" | "actorEmail" | "actorRole">,
    actor: AuthUser,
  ): Promise<PurchaseOrderSummary> {
    const poId = await this.db.$transaction((tx) =>
      createPurchaseOrderForOrderTx(tx, {
        ...input,
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
      }),
    );
    return this.getSummary(poId);
  }

  async getByOrderId(orderId: string): Promise<PurchaseOrderSummary | null> {
    const po = await this.db.purchaseOrder.findUnique({ where: { orderId } });
    if (!po) return null;
    return this.getSummary(po.id);
  }

  async getSummary(poId: string): Promise<PurchaseOrderSummary> {
    await this.repairPendingAckIfOrderConfirmed(poId);
    const po = await this.db.purchaseOrder.findUniqueOrThrow({
      where: { id: poId },
      include: {
        lines: true,
        revisions: { orderBy: { revisionNumber: "desc" } },
        acknowledgements: { orderBy: { createdAt: "desc" } },
        amendments: { orderBy: { createdAt: "desc" } },
      },
    });
    const revisionActorIds = [...new Set(po.revisions.map((r) => r.createdById))];
    const [order, orderDetails, buyer, supplier, revisionActors] = await Promise.all([
      this.db.workspace.findUnique({
        where: { id: po.orderId },
        select: { externalRef: true, spawnedFromId: true, spawnedFrom: { select: { id: true, type: true } } },
      }),
      this.db.orderWorkspace.findUnique({
        where: { workspaceId: po.orderId },
        select: { destinationPort: true, origin: true, parentWorkspaceId: true, parentWorkspaceType: true },
      }),
      this.db.user.findUnique({
        where: { id: po.buyerId },
        select: {
          displayName: true,
          email: true,
          organisation: { select: { name: true, location: true } },
        },
      }),
      this.db.user.findUnique({
        where: { id: po.supplierId },
        select: {
          displayName: true,
          email: true,
          organisation: { select: { name: true, location: true } },
        },
      }),
      revisionActorIds.length
        ? this.db.user.findMany({
            where: { id: { in: revisionActorIds } },
            select: { id: true, displayName: true, email: true },
          })
        : Promise.resolve([] as Array<{ id: string; displayName: string | null; email: string }>),
    ]);
    const actorById = new Map(
      revisionActors.map((u) => [
        u.id,
        { id: u.id, name: u.displayName?.trim() || u.email || "Unknown user" },
      ]),
    );
    return mapSummary(po, order?.externalRef ?? null, {
      buyerName: buyer?.organisation?.name ?? buyer?.displayName ?? null,
      buyerEmail: buyer?.email ?? null,
      supplierName: supplier?.organisation?.name ?? supplier?.displayName ?? null,
      supplierEmail: supplier?.email ?? null,
      supplierCountry: supplier?.organisation?.location ?? null,
      buyerContactName: buyer?.displayName ?? null,
      supplierContactName: supplier?.displayName ?? null,
    }, {
      destinationPort: orderDetails?.destinationPort ?? null,
      rfqWorkspaceId:
        order?.spawnedFrom?.type === "RFQ"
          ? order.spawnedFrom.id
          : orderDetails?.parentWorkspaceType === "RFQ"
            ? orderDetails.parentWorkspaceId
            : null,
      commodityBidWorkspaceId:
        order?.spawnedFrom?.type === "COMMODITYBID"
          ? order.spawnedFrom.id
          : orderDetails?.parentWorkspaceType === "COMMODITYBID"
            ? orderDetails.parentWorkspaceId
            : null,
    }, actorById);
  }

  /** Sprint 29-01 — list revisions (reuses getSummary mapping; no duplicate rules). */
  async listRevisions(poId: string): Promise<PurchaseOrderRevision[]> {
    const summary = await this.getSummary(poId);
    return summary.revisions;
  }

  /** Sprint 29-01 — single revision detail. */
  async getRevision(poId: string, revisionId: string): Promise<PurchaseOrderRevision> {
    const revisions = await this.listRevisions(poId);
    const found = revisions.find((r) => r.id === revisionId);
    if (!found) throw new AppError(404, "REVISION_NOT_FOUND");
    return found;
  }

  async list(actor: AuthUser, query: PurchaseOrderListQuery): Promise<PurchaseOrderListResponse> {
    return listPurchaseOrders(this.db, actor, query);
  }

  async getDashboard(actor?: AuthUser): Promise<PoDashboardMetrics> {
    // When actor provided, compute metrics from accessible POs.
    if (actor) {
      const accessible = await listPurchaseOrders(this.db, actor, {
        page: 1,
        pageSize: 5000,
        sort: "createdAt",
        direction: "desc",
        search: undefined,
      });
      const items = accessible.items;
      const bySource = emptyBySource();
      const totals = {
        all: items.length,
        draft: 0,
        issued: 0,
        acknowledged: 0,
        amendmentRequested: 0,
        amended: 0,
        closed: 0,
        cancelled: 0,
      };
      const valueMap = new Map<string, { openTotal: number; closedTotal: number }>();
      let awaitingAcknowledgement = 0;
      let amendmentsOpen = 0;

      for (const item of items) {
        bySource[item.source] = (bySource[item.source] ?? 0) + 1;
        const status = canonicalizePurchaseOrderStatus(item.status);
        switch (status) {
          case "DRAFT": totals.draft += 1; break;
          case "SUBMITTED":
            totals.issued += 1; break;
          case "APPROVED":
            totals.acknowledged += 1; break;
          case "IN_EXECUTION":
          case "COMPLETED":
            totals.amended += 1; break;
          case "CLOSED": totals.closed += 1; break;
          case "CANCELLED": totals.cancelled += 1; break;
        }
        if ((item.openAmendments ?? 0) > 0) totals.amendmentRequested += 1;
        if (item.pendingAcknowledgement) awaitingAcknowledgement += 1;
        amendmentsOpen += item.openAmendments ?? 0;
        if (item.totalAmount != null && Number.isFinite(item.totalAmount)) {
          const bucket = valueMap.get(item.currency) ?? { openTotal: 0, closedTotal: 0 };
          if (["SUBMITTED", "APPROVED", "IN_EXECUTION", "COMPLETED"].includes(status)) {
            bucket.openTotal += item.totalAmount;
          } else if (status === "CLOSED") {
            bucket.closedTotal += item.totalAmount;
          }
          valueMap.set(item.currency, bucket);
        }
      }

      const active = totals.issued + totals.acknowledged + totals.amendmentRequested + totals.amended;
      const recent = items.slice(0, 5);

      return {
        openPoCount: active,
        acknowledgementPending: awaitingAcknowledgement,
        amendmentsOpen,
        poValueOpen: 0,
        closedPoValue: 0,
        bySource,
        totals,
        operational: {
          active,
          awaitingAcknowledgement,
          expectedWithin30Days: 0,
        },
        valueByCurrency: Array.from(valueMap.entries()).map(([currency, v]) => ({
          currency,
          openTotal: v.openTotal,
          closedTotal: v.closedTotal,
        })),
        recent,
      };
    }

    const open = await this.db.purchaseOrder.findMany({
      where: { status: { in: ["SUBMITTED", "APPROVED", "IN_EXECUTION", "COMPLETED", "ISSUED", "ACKNOWLEDGED", "AMENDMENT_REQUESTED", "AMENDED"] } },
      include: { lines: true },
    });
    const closed = await this.db.purchaseOrder.findMany({
      where: { status: "CLOSED" },
      include: { lines: true },
    });

    const ackPending = open.filter((p) =>
      ["SUBMITTED", "ISSUED"].includes(p.status),
    ).length;

    const amendmentsOpen = await this.db.purchaseOrderAmendment.count({
      where: { status: "OPEN" },
    });

    const allForSource = await this.db.purchaseOrder.groupBy({
      by: ["source"],
      _count: { _all: true },
    });
    const bySource = emptyBySource();
    for (const row of allForSource) {
      const key = canonicalizePurchaseOrderSource(String(row.source));
      bySource[key] = row._count._all;
    }

    const statusGroups = await this.db.purchaseOrder.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const statusCount = (s: string) =>
      statusGroups.find((g) => g.status === s)?._count._all ?? 0;

    const valueMap = new Map<string, { openTotal: number; closedTotal: number }>();
    const addValue = (currency: string, amount: number, kind: "open" | "closed") => {
      const bucket = valueMap.get(currency) ?? { openTotal: 0, closedTotal: 0 };
      if (kind === "open") bucket.openTotal += amount;
      else bucket.closedTotal += amount;
      valueMap.set(currency, bucket);
    };
    for (const p of open) {
      const sum = p.lines.reduce((s, l) => s + Number(l.lineTotal), 0);
      addValue(p.currency, sum, "open");
    }
    for (const p of closed) {
      const sum = p.lines.reduce((s, l) => s + Number(l.lineTotal), 0);
      addValue(p.currency, sum, "closed");
    }

    return {
      openPoCount: open.length,
      acknowledgementPending: ackPending,
      amendmentsOpen,
      poValueOpen: 0,
      closedPoValue: 0,
      bySource,
      totals: {
        all: statusGroups.reduce((s, g) => s + g._count._all, 0),
        draft: statusCount("DRAFT"),
        issued: statusCount("SUBMITTED") + statusCount("ISSUED"),
        acknowledged: statusCount("APPROVED") + statusCount("ACKNOWLEDGED"),
        amendmentRequested: statusCount("AMENDMENT_REQUESTED"),
        amended: statusCount("IN_EXECUTION") + statusCount("AMENDED") + statusCount("COMPLETED"),
        closed: statusCount("CLOSED"),
        cancelled: statusCount("CANCELLED"),
      },
      operational: {
        active: open.length,
        awaitingAcknowledgement: ackPending,
        expectedWithin30Days: 0,
      },
      valueByCurrency: Array.from(valueMap.entries()).map(([currency, v]) => ({
        currency,
        openTotal: v.openTotal,
        closedTotal: v.closedTotal,
      })),
      recent: [],
    };
  }

  async applyPoAction(
    poId: string,
    action: PoAction,
    actor: AuthUser,
    payload: Record<string, unknown> = {},
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<PurchaseOrderSummary> {
    if (!(await canAccessPo(this.db, actor, poId))) throw new AppError(403, "FORBIDDEN");
    try {
      assertPoActionRole(action, actor.role);
    } catch {
      throw new AppError(403, "FORBIDDEN_ROLE");
    }

    switch (action) {
      case "submit_po":
        await this.submitPo(poId, actor, SubmitPoPayload.parse(payload), ctx);
        break;
      case "approve_po":
        await this.approvePo(poId, actor, ApprovePoPayload.parse(payload), ctx);
        break;
      case "start_execution":
        await this.startExecution(poId, actor, StartExecutionPayload.parse(payload), ctx);
        break;
      case "complete_po":
        await this.completePo(poId, actor, CompletePoPayload.parse(payload), ctx);
        break;
      case "acknowledge_po":
        await this.acknowledge(poId, actor, AcknowledgePoPayload.parse(payload), ctx);
        break;
      case "request_amendment":
        await this.requestAmendment(poId, actor, RequestAmendmentPayload.parse(payload), ctx);
        break;
      case "approve_amendment":
        await this.approveAmendment(poId, actor, ApproveAmendmentPayload.parse(payload), ctx);
        break;
      case "reject_amendment":
        await this.rejectAmendment(poId, actor, RejectAmendmentPayload.parse(payload), ctx);
        break;
      case "close_po":
        await this.closePo(poId, actor, ClosePoPayload.parse(payload), ctx);
        break;
      case "cancel_po":
        await this.cancelPo(poId, actor, CancelPoPayload.parse(payload), ctx);
        break;
      case "issue_po":
        throw new AppError(400, "USE_RFQ_ISSUE_PO");
      default:
        throw new AppError(400, "UNKNOWN_ACTION");
    }
    return this.getSummary(poId);
  }

  private async acknowledge(
    poId: string,
    actor: AuthUser,
    input: AcknowledgePoPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    if (po.supplierId !== actor.id && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new AppError(403, "FORBIDDEN_NOT_SUPPLIER");
    }
    assertAcknowledgeAllowed(po.status);
    if (input.status === "ACCEPTED" || input.status === "REJECTED") {
      assertVersionMatch(po.version, input.version ?? po.version);
    }

    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrderAcknowledgement.create({
        data: {
          purchaseOrderId: po.id,
          supplierUserId: actor.id,
          status: input.status,
          notes: input.notes,
        },
      });
      const nextStatus = input.status === "ACCEPTED"
        ? "APPROVED"
        : input.status === "REJECTED"
          ? "CANCELLED"
          : canonicalizePurchaseOrderStatus(po.status);
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: nextStatus, version: { increment: 1 } },
      });
      await this.audit(tx, po.orderId, actor, "po.acknowledged", {
        poId,
        status: input.status,
        oldValue: { status: po.status },
        newValue: { status: nextStatus },
        changedFields: ["status"],
        revision: po.version + 1,
      }, ctx, po.status, nextStatus);
      await this.timeline(tx, po.orderId, actor.id, "po.acknowledged", { poId, status: input.status });
      if (input.status === "ACCEPTED") {
        await this.timeline(tx, po.orderId, actor.id, "po.approved", { poId, via: "acknowledge_po" });
      }
      if (input.status === "REJECTED") {
        await this.timeline(tx, po.orderId, actor.id, "po.cancelled", { poId, via: "acknowledge_reject" });
      }
      const participants = await tx.workspaceParticipant.findMany({
        where: { workspaceId: po.orderId, leftAt: null },
      });
      await notifyPoEvent(tx, {
        orderId: po.orderId,
        userIds: participants.map((p) => p.userId).filter((id) => id !== actor.id),
        title: `PO ${input.status === "ACCEPTED" ? "acknowledged" : "rejected"}`,
        message: `PO ${po.poNumber} ${input.status.toLowerCase()}`,
      });
    });

    if (input.status === "REJECTED") {
      await upsertControlTowerAlert(this.db, {
        workspaceId: po.orderId,
        alertKey: AlertKey.PO_REJECTED,
        severity: "CRITICAL",
        category: "ORDER",
        workspaceType: "ORDER",
        title: "PO rejected by supplier",
        description: `PO ${po.poNumber} — rejected by supplier.`,
      }, { allowTestWorkspace: true });
    }

    this.emit(SocketEvents.PO_ACKNOWLEDGED, po.orderId, poId, { status: input.status });
  }

  private async requestAmendment(
    poId: string,
    actor: AuthUser,
    input: RequestAmendmentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    assertAmendmentAllowed(po.status);
    assertVersionMatch(po.version, input.version ?? po.version);
    const openCount = await this.db.purchaseOrderAmendment.count({
      where: { purchaseOrderId: po.id, status: "OPEN" },
    });
    if (openCount > 0) throw new AppError(409, "AMENDMENT_ALREADY_OPEN");

    await this.db.$transaction(async (tx) => {
      const amendment = await tx.purchaseOrderAmendment.create({
        data: {
          purchaseOrderId: po.id,
          requestedById: actor.id,
          reason: input.reason,
          proposedLines: input.proposedLines
            ? (input.proposedLines as Prisma.InputJsonValue)
            : undefined,
          status: "OPEN",
        },
      });
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { version: { increment: 1 } },
      });
      await this.audit(tx, po.orderId, actor, "po.amendment.requested", {
        poId,
        amendmentId: amendment.id,
      }, ctx);
      await this.timeline(tx, po.orderId, actor.id, "po.amendment.requested", {
        poId,
        amendmentId: amendment.id,
      });
      const participants = await tx.workspaceParticipant.findMany({
        where: { workspaceId: po.orderId, leftAt: null },
      });
      await notifyPoEvent(tx, {
        orderId: po.orderId,
        userIds: participants.map((p) => p.userId).filter((id) => id !== actor.id),
        title: "PO amendment requested",
        message: input.reason,
        email: true,
      });
      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(po.orderId, SocketEvents.PO_AMENDMENT_REQUESTED, {
          poId,
          orderId: po.orderId,
          amendmentId: amendment.id,
        });
      });
    });
  }

  private async approveAmendment(
    poId: string,
    actor: AuthUser,
    input: ApproveAmendmentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    assertAmendmentAllowed(po.status);
    assertVersionMatch(po.version, input.version);
    const amendment = await this.db.purchaseOrderAmendment.findUnique({
      where: { id: input.amendmentId },
    });
    if (!amendment || amendment.purchaseOrderId !== po.id || amendment.status !== "OPEN") {
      throw new AppError(404, "AMENDMENT_NOT_FOUND");
    }

    const lines = input.lines?.length
      ? input.lines
      : (amendment.proposedLines as ApproveAmendmentPayload["lines"] | null) ?? undefined;
    if (!lines?.length) throw new AppError(400, "AMENDMENT_LINES_REQUIRED");

    let createdRevisionId: string | null = null;
    await this.db.$transaction(async (tx) => {
      if (lines.length) {
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: po.id } });
        for (const l of lines) {
          await tx.purchaseOrderLine.create({
            data: {
              purchaseOrderId: po.id,
              sku: l.sku ?? null,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.quantity * l.unitPrice,
            },
          });
        }
      }

      const updated = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: po.id },
        include: { lines: true },
      });
      const revNum = (await tx.purchaseOrderRevision.count({ where: { purchaseOrderId: po.id } })) + 1;
      const snapshot = {
        header: {
          poNumber: updated.poNumber,
          currency: updated.currency,
          incoterm: updated.incoterm,
          paymentTerms: updated.paymentTerms,
          deliveryTerms: updated.deliveryTerms,
          status: "IN_EXECUTION",
        },
        lines: updated.lines.map((l) => ({
          sku: l.sku,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
        })),
      };

      const rev = await tx.purchaseOrderRevision.create({
        data: {
          purchaseOrderId: po.id,
          revisionNumber: revNum,
          createdById: actor.id,
          reason: input.reason,
          snapshotJson: snapshot as Prisma.InputJsonValue,
        },
      });
      createdRevisionId = rev.id;

      await tx.purchaseOrderAmendment.update({
        where: { id: amendment.id },
        data: { status: "APPROVED" },
      });
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "IN_EXECUTION", version: { increment: 1 } },
      });

      await this.audit(tx, po.orderId, actor, "po.amendment.approved", {
        poId,
        amendmentId: amendment.id,
        revisionNumber: revNum,
        oldValue: { status: po.status },
        newValue: { status: "IN_EXECUTION" },
        changedFields: ["status", "lines"],
        revision: po.version + 1,
      }, ctx, po.status, "IN_EXECUTION");
      await this.timeline(tx, po.orderId, actor.id, "po.amendment.approved", {
        poId,
        amendmentId: amendment.id,
      });
      // Exactly one po.revised event per approved amendment (PRR-01-03)
      await this.timeline(tx, po.orderId, actor.id, "po.revised", {
        poId,
        amendmentId: amendment.id,
        revisionId: rev.id,
        revisionNumber: revNum,
      });

      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(po.orderId, SocketEvents.PO_AMENDMENT_APPROVED, {
          poId,
          orderId: po.orderId,
          amendmentId: amendment.id,
        });
      });
    });

    // Fire automation outside tx (best-effort) — single invocation per approve
    if (createdRevisionId) {
      void import("../operational-task/operational-task.automation.js").then(({ runOperationalTaskAutomation }) =>
        runOperationalTaskAutomation(this.db, {
          type: "po.revised",
          orderId: po.orderId,
          revisionId: createdRevisionId!,
          actorUserId: actor.id,
        }),
      );
    }
  }

  private async rejectAmendment(
    poId: string,
    actor: AuthUser,
    input: RejectAmendmentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    const amendment = await this.db.purchaseOrderAmendment.findUnique({
      where: { id: input.amendmentId },
    });
    if (!amendment || amendment.purchaseOrderId !== po.id || amendment.status !== "OPEN") {
      throw new AppError(404, "AMENDMENT_NOT_FOUND");
    }

    const priorStatus = canonicalizePurchaseOrderStatus(po.status);

    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrderAmendment.update({
        where: { id: amendment.id },
        data: { status: "DECLINED" },
      });
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: priorStatus },
      });
      await this.audit(tx, po.orderId, actor, "po.amendment.rejected", {
        poId,
        amendmentId: amendment.id,
        reason: input.reason,
      }, ctx);
      await this.timeline(tx, po.orderId, actor.id, "po.amendment.rejected", {
        poId,
        amendmentId: amendment.id,
      });
      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(po.orderId, SocketEvents.PO_AMENDMENT_REJECTED, {
          poId,
          orderId: po.orderId,
          amendmentId: amendment.id,
        });
      });
    });
  }

  private async closePo(
    poId: string,
    actor: AuthUser,
    input: ClosePoPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    assertCloseAllowed(po.status);
    assertVersionMatch(po.version, input.version);
    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "CLOSED", closedAt: new Date(), version: { increment: 1 } },
      });
      await this.audit(tx, po.orderId, actor, "po.closed", {
        poId,
        reason: input.reason,
        oldValue: { status: po.status },
        newValue: { status: "CLOSED" },
        changedFields: ["status", "closedAt"],
        revision: po.version + 1,
      }, ctx, po.status, "CLOSED");
      await this.timeline(tx, po.orderId, actor.id, "po.closed", { poId });
      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(po.orderId, SocketEvents.PO_CLOSED, { poId, orderId: po.orderId });
      });
    });
  }

  private async cancelPo(
    poId: string,
    actor: AuthUser,
    input: CancelPoPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    assertCancelAllowed(po.status);
    assertVersionMatch(po.version, input.version);
    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "CANCELLED", closedAt: new Date(), version: { increment: 1 } },
      });
      await this.audit(tx, po.orderId, actor, "po.cancelled", {
        poId,
        reason: input.reason,
        oldValue: { status: po.status },
        newValue: { status: "CANCELLED" },
        changedFields: ["status", "closedAt"],
        revision: po.version + 1,
      }, ctx, po.status, "CANCELLED");
      await this.timeline(tx, po.orderId, actor.id, "po.cancelled", { poId, reason: input.reason });
    });
  }

  private async submitPo(
    poId: string,
    actor: AuthUser,
    input: SubmitPoPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    assertSubmitAllowed(po.status);
    assertVersionMatch(po.version, input.version);
    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: "SUBMITTED",
          issuedAt: po.issuedAt ?? new Date(),
          version: { increment: 1 },
        },
      });
      const pending = await tx.purchaseOrderAcknowledgement.count({
        where: { purchaseOrderId: po.id, status: "PENDING" },
      });
      if (!pending) {
        await tx.purchaseOrderAcknowledgement.create({
          data: { purchaseOrderId: po.id, supplierUserId: po.supplierId, status: "PENDING" },
        });
      }
      await this.audit(tx, po.orderId, actor, "po.submitted", {
        poId,
        oldValue: { status: po.status },
        newValue: { status: "SUBMITTED" },
        changedFields: ["status"],
        revision: po.version + 1,
      }, ctx, po.status, "SUBMITTED");
      await this.timeline(tx, po.orderId, actor.id, "po.submitted", { poId });
    });
  }

  private async approvePo(
    poId: string,
    actor: AuthUser,
    input: ApprovePoPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    assertApproveAllowed(po.status);
    assertVersionMatch(po.version, input.version);
    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "APPROVED", version: { increment: 1 } },
      });
      await this.audit(tx, po.orderId, actor, "po.approved", {
        poId,
        oldValue: { status: po.status },
        newValue: { status: "APPROVED" },
        changedFields: ["status"],
        revision: po.version + 1,
      }, ctx, po.status, "APPROVED");
      await this.timeline(tx, po.orderId, actor.id, "po.approved", { poId });
    });
  }

  private async startExecution(
    poId: string,
    actor: AuthUser,
    input: StartExecutionPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    assertStartExecutionAllowed(po.status);
    assertVersionMatch(po.version, input.version);
    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "IN_EXECUTION", version: { increment: 1 } },
      });
      await this.audit(tx, po.orderId, actor, "po.updated", {
        poId,
        oldValue: { status: po.status },
        newValue: { status: "IN_EXECUTION" },
        changedFields: ["status"],
        revision: po.version + 1,
      }, ctx, po.status, "IN_EXECUTION");
      await this.timeline(tx, po.orderId, actor.id, "po.updated", { poId, status: "IN_EXECUTION" });
    });
  }

  private async completePo(
    poId: string,
    actor: AuthUser,
    input: CompletePoPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    assertCompleteAllowed(po.status);
    assertVersionMatch(po.version, input.version);
    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "COMPLETED", version: { increment: 1 } },
      });
      await this.audit(tx, po.orderId, actor, "po.completed", {
        poId,
        oldValue: { status: po.status },
        newValue: { status: "COMPLETED" },
        changedFields: ["status"],
        revision: po.version + 1,
      }, ctx, po.status, "COMPLETED");
      await this.timeline(tx, po.orderId, actor.id, "po.completed", { poId });
    });
  }

  async updateDraft(
    poId: string,
    actor: AuthUser,
    raw: unknown,
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<PurchaseOrderSummary> {
    if (!(await canAccessPo(this.db, actor, poId))) throw new AppError(403, "FORBIDDEN");
    assertPoActionRole("submit_po", actor.role);
    const input = UpdateDraftPurchaseOrderSchema.parse(raw ?? {});
    const po = await this.requirePo(poId);
    assertDraftEditAllowed(po.status);
    assertVersionMatch(po.version, input.version);

    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          version: { increment: 1 },
          ...(input.currency ? { currency: input.currency } : {}),
          ...(input.incoterm !== undefined ? { incoterm: input.incoterm } : {}),
          ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
          ...(input.deliveryTerms !== undefined ? { deliveryTerms: input.deliveryTerms } : {}),
        },
      });
      if (input.lines?.length) {
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: po.id } });
        for (const l of input.lines) {
          const qty = l.quantity;
          const price = l.unitPrice ?? 0;
          await tx.purchaseOrderLine.create({
            data: {
              purchaseOrderId: po.id,
              sku: l.productCode ?? l.sku ?? l.unit ?? null,
              description: l.productName,
              quantity: qty,
              unitPrice: price,
              lineTotal: qty * price,
            },
          });
        }
      }
      await this.audit(tx, po.orderId, actor, "po.updated", {
        poId,
        oldValue: { status: po.status, version: po.version },
        newValue: { status: po.status, version: po.version + 1 },
        changedFields: Object.keys(input).filter((k) => k !== "version"),
        revision: po.version + 1,
      }, ctx, po.status, po.status);
      await this.timeline(tx, po.orderId, actor.id, "po.updated", { poId });
    });
    return this.getSummary(poId);
  }

  async deleteDraft(poId: string, actor: AuthUser): Promise<{ deleted: true }> {
    if (!(await canAccessPo(this.db, actor, poId))) throw new AppError(403, "FORBIDDEN");
    assertPoActionRole("cancel_po", actor.role);
    const po = await this.requirePo(poId);
    assertDraftEditAllowed(po.status);
    await this.db.$transaction(async (tx) => {
      await this.audit(tx, po.orderId, actor, "po.cancelled", {
        poId,
        oldValue: { status: po.status },
        newValue: null,
        changedFields: ["*"],
        via: "delete_draft",
      }, undefined, po.status, "CANCELLED");
      await this.timeline(tx, po.orderId, actor.id, "po.cancelled", { poId, via: "delete_draft" });
      await tx.purchaseOrder.delete({ where: { id: po.id } });
    });
    return { deleted: true };
  }

  private async requirePo(poId: string) {
    return this.db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
  }

  /** Backfill PO acknowledgement for orders confirmed before auto-sync existed. */
  private async repairPendingAckIfOrderConfirmed(poId: string): Promise<void> {
    const po = await this.db.purchaseOrder.findUnique({
      where: { id: poId },
      include: { acknowledgements: true },
    });
    if (!po) return;
    if (po.acknowledgements.some((a) => a.status === "ACCEPTED")) return;
    if (!["SUBMITTED", "APPROVED"].includes(canonicalizePurchaseOrderStatus(po.status))) return;

    const orderWs = await this.db.orderWorkspace.findUnique({
      where: { workspaceId: po.orderId },
      select: { supplierConfirmedAt: true },
    });
    if (!orderWs?.supplierConfirmedAt) return;

    const supplier = await this.db.user.findUnique({
      where: { id: po.supplierId },
      select: { email: true },
    });
    await this.db.$transaction((tx) =>
      autoAcknowledgePoOnSupplierConfirm(tx, po.orderId, {
        id: po.supplierId,
        email: supplier?.email ?? "supplier@unknown",
        role: "SUPPLIER",
      }, "Backfilled: order was confirmed before PO auto-ack"),
    );
  }

  private async audit(
    tx: Prisma.TransactionClient,
    orderId: string,
    actor: AuthUser,
    action: string,
    payload: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
    fromStatus?: string,
    toStatus?: string,
  ) {
    await tx.auditLog.create({
      data: {
        workspaceId: orderId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        fromState: fromStatus ?? String(payload.oldValue && typeof payload.oldValue === "object"
          ? (payload.oldValue as { status?: string }).status ?? "UNKNOWN"
          : "UNKNOWN"),
        toState: toStatus ?? String(payload.newValue && typeof payload.newValue === "object"
          ? (payload.newValue as { status?: string }).status ?? action
          : action),
        payload: {
          ...payload,
          changedBy: { id: actor.id, email: actor.email, role: actor.role },
          changedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        ipAddress: ctx?.ip,
        userAgent: ctx?.userAgent,
      },
    });
  }

  private async timeline(
    tx: Prisma.TransactionClient,
    orderId: string,
    actorUserId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    await tx.timelineEvent.create({
      data: {
        workspaceId: orderId,
        eventType,
        actorUserId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  private emit(event: string, orderId: string, poId: string, extra: Record<string, unknown>) {
    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(orderId, event, { poId, orderId, ...extra });
    });
  }
}

function mapSummary(
  po: {
    id: string;
    orderId: string;
    poNumber: string;
    buyerId: string;
    supplierId: string;
    currency: string;
    incoterm: string | null;
    paymentTerms: string | null;
    deliveryTerms: string | null;
    status: string;
    source: string;
    documentUrl: string | null;
    documentFileName: string | null;
    issuedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    version?: number;
    lines: Array<{
      id: string;
      purchaseOrderId: string;
      sku: string | null;
      description: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      createdAt: Date;
    }>;
    revisions: Array<{
      id: string;
      purchaseOrderId: string;
      revisionNumber: number;
      createdById: string;
      reason: string;
      snapshotJson: Prisma.JsonValue;
      createdAt: Date;
    }>;
    acknowledgements: Array<{
      id: string;
      purchaseOrderId: string;
      supplierUserId: string;
      status: string;
      notes: string | null;
      createdAt: Date;
    }>;
    amendments: Array<{
      id: string;
      purchaseOrderId: string;
      requestedById: string;
      reason: string;
      status: string;
      createdAt: Date;
    }>;
  },
  orderRef: string | null,
  parties: {
    buyerName: string | null;
    buyerEmail: string | null;
    supplierName: string | null;
    supplierEmail: string | null;
    supplierCountry?: string | null;
    buyerContactName?: string | null;
    supplierContactName?: string | null;
  } = { buyerName: null, buyerEmail: null, supplierName: null, supplierEmail: null },
  extras: {
    destinationPort?: string | null;
    rfqWorkspaceId?: string | null;
    commodityBidWorkspaceId?: string | null;
  } = {},
  actorById: Map<string, { id: string; name: string }> = new Map(),
): PurchaseOrderSummary {
  const pendingAck = !po.acknowledgements.some((a) => a.status === "ACCEPTED")
    && canonicalizePurchaseOrderStatus(po.status) === "SUBMITTED";

  const latestRevision = po.revisions[0];
  const currentRevisionNumber = resolveCurrentRevisionNumber(po.revisions);
  const snap = (latestRevision?.snapshotJson ?? {}) as Record<string, unknown>;
  const header = (snap.header ?? {}) as Record<string, unknown>;
  const snapLines = Array.isArray(snap.lines) ? (snap.lines as Array<Record<string, unknown>>) : [];
  const directLines = Array.isArray(snap.directLines)
    ? (snap.directLines as Array<Record<string, unknown>>)
    : Array.isArray(header.directLines)
      ? (header.directLines as Array<Record<string, unknown>>)
      : [];

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const documents = po.documentUrl
    ? [{
        id: `po-doc-${po.id}`,
        fileName: po.documentFileName ?? `PO-${po.poNumber}.pdf`,
        documentUrl: po.documentUrl,
        mimeType: "application/pdf",
        uploadedAt: po.issuedAt?.toISOString() ?? po.createdAt.toISOString(),
      }]
    : [];

  return {
    purchaseOrder: {
      id: po.id,
      orderId: po.orderId,
      orderRef,
      poNumber: po.poNumber,
      buyerId: po.buyerId,
      supplierId: po.supplierId,
      buyerName: parties.buyerName,
      buyerEmail: parties.buyerEmail,
      supplierName: parties.supplierName,
      supplierEmail: parties.supplierEmail,
      buyerContactName: parties.buyerContactName ?? null,
      supplierContactName: parties.supplierContactName ?? null,
      supplierCountry: parties.supplierCountry ?? null,
      currency: po.currency,
      incoterm: po.incoterm,
      paymentTerms: po.paymentTerms,
      deliveryTerms: po.deliveryTerms,
      status: canonicalizePurchaseOrderStatus(po.status) as PurchaseOrderSummary["purchaseOrder"]["status"],
      version: Number((po as { version?: number }).version ?? 1),
      source: canonicalizePurchaseOrderSource(po.source),
      documentUrl: po.documentUrl,
      documentFileName: po.documentFileName,
      issuedAt: po.issuedAt?.toISOString() ?? null,
      closedAt: po.closedAt?.toISOString() ?? null,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
      buyerReference: str(header.buyerReference),
      notes: str(header.notes),
      expectedDeliveryDate: str(header.expectedDeliveryDate),
      destinationCountry: str(header.destinationCountryCode) ?? str(header.destinationCountry),
      destinationPort: str(header.destinationPort) ?? extras.destinationPort ?? null,
      rfqWorkspaceId: extras.rfqWorkspaceId ?? null,
      commodityBidWorkspaceId: extras.commodityBidWorkspaceId ?? null,
      parentPurchaseOrderId: str(header.parentPurchaseOrderId),
      documents,
    },
    lines: po.lines.map((l, i) => {
      const fromDirect = directLines[i] ?? null;
      const fromSnap = snapLines[i] ?? null;
      const parsed = parseComposedDirectDescription(l.description);
      const storedPrice = Number(l.unitPrice);
      const storedTotal = Number(l.lineTotal);
      // Direct PO may persist 0 when unitPrice was omitted — restore null from revision snapshot.
      const snapshotPriceAbsent =
        fromDirect != null && (fromDirect.unitPrice === null || fromDirect.unitPrice === undefined);
      const unitPrice = snapshotPriceAbsent && storedPrice === 0 ? null : storedPrice;
      const lineTotal = unitPrice == null ? null : storedTotal;
      return {
        id: l.id,
        purchaseOrderId: l.purchaseOrderId,
        sku: l.sku,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice,
        lineTotal,
        createdAt: l.createdAt.toISOString(),
        productName: str(fromDirect?.productName) ?? str(fromSnap?.productName) ?? parsed.productName,
        productCode: str(fromDirect?.productCode) ?? str(fromSnap?.productCode) ?? parsed.productCode ?? l.sku,
        specification: str(fromDirect?.specification) ?? str(fromSnap?.specification) ?? parsed.specification,
        packaging: str(fromDirect?.packaging) ?? str(fromSnap?.packaging) ?? parsed.packaging,
        unit: str(fromDirect?.unit) ?? str(fromSnap?.unit) ?? parsed.unit,
        productId:
          (l as { productId?: string | null }).productId ??
          str(fromDirect?.productId) ??
          null,
      };
    }),
    revisions: po.revisions.map((r) => ({
      id: r.id,
      purchaseOrderId: r.purchaseOrderId,
      revisionNumber: r.revisionNumber,
      createdById: r.createdById,
      reason: r.reason,
      snapshotJson: r.snapshotJson as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
      createdBy: actorById.get(r.createdById) ?? {
        id: r.createdById,
        name: "Unknown user",
      },
      isCurrent: currentRevisionNumber != null && r.revisionNumber === currentRevisionNumber,
    })),
    acknowledgements: po.acknowledgements.map((a) => ({
      id: a.id,
      purchaseOrderId: a.purchaseOrderId,
      supplierUserId: a.supplierUserId,
      status: a.status as PurchaseOrderSummary["acknowledgements"][number]["status"],
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
    })),
    amendments: po.amendments.map((a) => ({
      id: a.id,
      purchaseOrderId: a.purchaseOrderId,
      requestedById: a.requestedById,
      reason: a.reason,
      status: a.status as PurchaseOrderSummary["amendments"][number]["status"],
      createdAt: a.createdAt.toISOString(),
    })),
    pendingAcknowledgement: pendingAck,
    openAmendments: po.amendments.filter((a) => a.status === "OPEN").length,
  };
}

/** Recover structured Direct PO fields from composed description (Sprint 27 storage). */
function parseComposedDirectDescription(description: string): {
  productName: string | null;
  productCode: string | null;
  specification: string | null;
  packaging: string | null;
  unit: string | null;
} {
  const parts = description.split(" — ").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { productName: null, productCode: null, specification: null, packaging: null, unit: null };
  }
  let specification: string | null = null;
  let packaging: string | null = null;
  let unit: string | null = null;
  const rest: string[] = [];
  for (const part of parts.slice(1)) {
    if (part.startsWith("Spec:")) specification = part.slice(5).trim() || null;
    else if (part.startsWith("Pack:")) packaging = part.slice(5).trim() || null;
    else if (part.startsWith("Unit:")) unit = part.slice(5).trim() || null;
    else rest.push(part);
  }
  return {
    productName: parts[0] ?? null,
    productCode: null,
    specification,
    packaging,
    unit,
  };
}
