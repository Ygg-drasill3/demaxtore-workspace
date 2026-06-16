import type { Prisma, PrismaClient } from "@prisma/client";
import type { PoAction, PurchaseOrderSummary, PoDashboardMetrics } from "@dmx/contracts/purchase-order";
import {
  AcknowledgePoPayload,
  ApproveAmendmentPayload,
  CancelPoPayload,
  ClosePoPayload,
  RejectAmendmentPayload,
  RequestAmendmentPayload,
} from "@dmx/contracts/purchase-order.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { AppError } from "../../utils/httpErrors.js";
import { assertPoActionRole, canAccessPo, type AuthUser } from "./purchase-order.policy.js";
import { notifyPoEvent } from "./purchase-order.notifications.js";
import { autoAcknowledgePoOnSupplierConfirm } from "./purchase-order.sync.js";

export class PurchaseOrderService {
  constructor(private readonly db: PrismaClient) {}

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
    const [order, buyer, supplier] = await Promise.all([
      this.db.workspace.findUnique({
        where: { id: po.orderId },
        select: { externalRef: true },
      }),
      this.db.user.findUnique({
        where: { id: po.buyerId },
        select: { displayName: true, email: true },
      }),
      this.db.user.findUnique({
        where: { id: po.supplierId },
        select: { displayName: true, email: true },
      }),
    ]);
    return mapSummary(po, order?.externalRef ?? null, {
      buyerName: buyer?.displayName ?? null,
      buyerEmail: buyer?.email ?? null,
      supplierName: supplier?.displayName ?? null,
      supplierEmail: supplier?.email ?? null,
    });
  }

  async getDashboard(): Promise<PoDashboardMetrics> {
    const open = await this.db.purchaseOrder.findMany({
      where: { status: { in: ["ISSUED", "ACKNOWLEDGED", "AMENDMENT_REQUESTED", "AMENDED"] } },
      include: { lines: true },
    });
    const closed = await this.db.purchaseOrder.findMany({
      where: { status: "CLOSED" },
      include: { lines: true },
    });
    const sumLines = (rows: typeof open) =>
      rows.reduce((acc, p) => acc + p.lines.reduce((s, l) => s + Number(l.lineTotal), 0), 0);

    const ackPending = open.filter((p) =>
      ["ISSUED", "AMENDMENT_REQUESTED"].includes(p.status),
    ).length;

    const amendmentsOpen = await this.db.purchaseOrderAmendment.count({
      where: { status: "OPEN" },
    });

    return {
      openPoCount: open.length,
      acknowledgementPending: ackPending,
      amendmentsOpen,
      poValueOpen: sumLines(open),
      closedPoValue: sumLines(closed),
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
    if (po.supplierId !== actor.id && actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN_NOT_SUPPLIER");
    }
    if (!["ISSUED", "AMENDED"].includes(po.status)) {
      throw new AppError(409, "INVALID_PO_STATE");
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
        ? "ACKNOWLEDGED"
        : input.status === "REJECTED"
          ? "CANCELLED"
          : po.status;
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: nextStatus },
      });
      await this.audit(tx, po.orderId, actor, "po.acknowledged", {
        poId,
        status: input.status,
      }, ctx);
      await this.timeline(tx, po.orderId, actor.id, "po.acknowledged", { poId, status: input.status });
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

    this.emit(SocketEvents.PO_ACKNOWLEDGED, po.orderId, poId, { status: input.status });
  }

  private async requestAmendment(
    poId: string,
    actor: AuthUser,
    input: RequestAmendmentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const po = await this.requirePo(poId);
    if (!["ACKNOWLEDGED", "AMENDED", "ISSUED"].includes(po.status)) {
      throw new AppError(409, "INVALID_PO_STATE");
    }
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
        data: { status: "AMENDMENT_REQUESTED" },
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
          status: "AMENDED",
        },
        lines: updated.lines.map((l) => ({
          sku: l.sku,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
        })),
      };

      await tx.purchaseOrderRevision.create({
        data: {
          purchaseOrderId: po.id,
          revisionNumber: revNum,
          createdById: actor.id,
          reason: input.reason,
          snapshotJson: snapshot as Prisma.InputJsonValue,
        },
      });

      await tx.purchaseOrderAmendment.update({
        where: { id: amendment.id },
        data: { status: "APPROVED" },
      });
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "AMENDED" },
      });

      await this.audit(tx, po.orderId, actor, "po.amendment.approved", {
        poId,
        amendmentId: amendment.id,
        revisionNumber: revNum,
      }, ctx);
      await this.timeline(tx, po.orderId, actor.id, "po.amendment.approved", {
        poId,
        amendmentId: amendment.id,
      });

      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(po.orderId, SocketEvents.PO_AMENDMENT_APPROVED, {
          poId,
          orderId: po.orderId,
          amendmentId: amendment.id,
        });
      });
    });
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

    const priorStatus = po.status === "AMENDMENT_REQUESTED"
      ? (await this.db.purchaseOrderRevision.count({ where: { purchaseOrderId: po.id } })) > 1
        ? "AMENDED"
        : "ACKNOWLEDGED"
      : po.status;

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
    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      await this.audit(tx, po.orderId, actor, "po.closed", { poId, reason: input.reason }, ctx);
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
    await this.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "CANCELLED", closedAt: new Date() },
      });
      await this.audit(tx, po.orderId, actor, "po.cancelled", { poId, reason: input.reason }, ctx);
      await this.timeline(tx, po.orderId, actor.id, "po.cancelled", { poId, reason: input.reason });
    });
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
    if (!["ISSUED", "AMENDMENT_REQUESTED"].includes(po.status)) return;

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
  ) {
    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: orderId }, select: { state: true } });
    await tx.auditLog.create({
      data: {
        workspaceId: orderId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        fromState: ws.state,
        toState: ws.state,
        payload: payload as Prisma.InputJsonValue,
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
  } = { buyerName: null, buyerEmail: null, supplierName: null, supplierEmail: null },
): PurchaseOrderSummary {
  const latestAck = po.acknowledgements[0];
  const pendingAck = !po.acknowledgements.some((a) => a.status === "ACCEPTED")
    && ["ISSUED", "AMENDMENT_REQUESTED"].includes(po.status);
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
      currency: po.currency,
      incoterm: po.incoterm,
      paymentTerms: po.paymentTerms,
      deliveryTerms: po.deliveryTerms,
      status: po.status as PurchaseOrderSummary["purchaseOrder"]["status"],
      source: (po.source === "manual" ? "manual" : "auto") as PurchaseOrderSummary["purchaseOrder"]["source"],
      documentUrl: po.documentUrl,
      documentFileName: po.documentFileName,
      issuedAt: po.issuedAt?.toISOString() ?? null,
      closedAt: po.closedAt?.toISOString() ?? null,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    },
    lines: po.lines.map((l) => ({
      id: l.id,
      purchaseOrderId: l.purchaseOrderId,
      sku: l.sku,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
      createdAt: l.createdAt.toISOString(),
    })),
    revisions: po.revisions.map((r) => ({
      id: r.id,
      purchaseOrderId: r.purchaseOrderId,
      revisionNumber: r.revisionNumber,
      createdById: r.createdById,
      reason: r.reason,
      snapshotJson: r.snapshotJson as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
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
