import type { Prisma, PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import type {
  ExceptionHubAnalytics,
  ExceptionHubDetail,
  ExceptionHubKpis,
  ExceptionHubPayload,
  ExceptionHubQuery,
  ExceptionHubRow,
  ExceptionOwnerRole,
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionType,
  TradeExceptionsPanelPayload,
} from "@dmx/contracts/exception-hub";
import type { AuthUser } from "../order/order.policy.js";
import { canAccessTrade } from "../trade/trade.policy.js";
import { collectTradeGraph, resolveTradeRoot, tradeRefFromRoot } from "../trade/trade.resolver.js";
import { AppError } from "../../utils/httpErrors.js";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import { isExceptionEngineV2Enabled } from "../exception-engine/exception-engine.service.js";

const ESCALATION_HOURS: Record<ExceptionSeverity, number | null> = {
  Critical: 24,
  High: 48,
  Medium: 72,
  Low: null,
};

const ALERT_TYPE_MAP: Record<string, ExceptionType> = {
  [AlertKey.RFQ_SUBMITTED_UNASSIGNED]: "Manual Exception",
  [AlertKey.RFQ_OPEN_NO_QUOTES_DEADLINE]: "Manual Exception",
  [AlertKey.RFQ_PROFORMA_SLA_PAST]: "PO Pending",
  [AlertKey.CB_OPEN_NO_BIDS_DEADLINE]: "Manual Exception",
  [AlertKey.CB_AWARD_ACCEPTANCE_OVERDUE]: "PO Pending",
  [AlertKey.CB_NO_SUPPLIERS_JOINED]: "Manual Exception",
  [AlertKey.CB_LOW_PARTICIPATION]: "Manual Exception",
  [AlertKey.CB_AUCTION_FAILED]: "Manual Exception",
  [AlertKey.CB_AUCTION_CLOSED]: "Manual Exception",
  [AlertKey.CB_AWAITING_BUYER_APPROVAL]: "PO Pending",
  [AlertKey.CB_REJECTED]: "Manual Exception",
  [AlertKey.ORDER_CREATED_INACTIVE]: "Production Delay",
  [AlertKey.TRACKING_DELAY_DETECTED]: "Shipment Delay",
  [AlertKey.TRACKING_ETA_SHIFT_24H]: "ETA Change",
  [AlertKey.TRACKING_ETA_SHIFT_72H]: "ETA Change",
  [AlertKey.SHIPMENT_ETA_EXCEEDED]: "Shipment Delay",
  [AlertKey.SHIPMENT_CUSTOMS_STUCK]: "Customs Issue",
  [AlertKey.SHIPMENT_EXCEPTION]: "Manual Exception",
  [AlertKey.ORDER_PRODUCTION_STALLED]: "Production Delay",
  [AlertKey.TRADE_DOC_REQUIRED_MISSING]: "Missing Document",
  [AlertKey.TRADE_DOC_MISSING_72H]: "Missing Document",
  [AlertKey.TRADE_DOC_REJECTED]: "Document Rejected",
  [AlertKey.TRADE_DOC_DELIVERED_INCOMPLETE]: "Missing Document",
  [AlertKey.PO_NO_ACK_72H]: "PO Pending",
  [AlertKey.PO_AMENDMENT_OPEN_72H]: "PO Pending",
  [AlertKey.PO_CANCELLED]: "PO Pending",
  [AlertKey.PO_REJECTED]: "PO Pending",
  [AlertKey.ORDER_INSPECTION_SLA_PAST]: "Inspection Issue",
  [AlertKey.ORDER_SHIPMENT_STATE_MISMATCH]: "Order/Shipment Mismatch",
  [AlertKey.FREIGHT_NO_OFFER_72H]: "Carrier Update",
  [AlertKey.FREIGHT_OFFER_EXPIRED]: "Carrier Update",
  [AlertKey.FREIGHT_SELECTED_NO_SHIPMENT]: "Carrier Update",
  [AlertKey.FREIGHT_NO_COMMUNICATION_24H]: "Carrier Update",
  [AlertKey.FREIGHT_NO_RESPONSE_72H]: "Carrier Update",
  [AlertKey.FREIGHT_NO_OFFER_96H]: "Carrier Update",
  [AlertKey.FREIGHT_OFFER_EXPIRED_BEFORE_SELECTION]: "Carrier Update",
  [AlertKey.FREIGHT_MARGIN_MISSING]: "Carrier Update",
  [AlertKey.FREIGHT_MARGIN_LOW]: "Carrier Update",
  [AlertKey.FREIGHT_MARGIN_NEGATIVE]: "Carrier Update",
  [AlertKey.FREIGHT_MARGIN_OVERRIDE]: "Carrier Update",
  [AlertKey.FREIGHT_ROUTE_UNDERPERFORMING]: "Carrier Update",
  [AlertKey.MC_PAYMENT_PENDING]: "Payment Pending",
  [AlertKey.BC_PAYMENT_PENDING]: "Payment Pending",
  [AlertKey.COMM_QUESTION_UNREAD_48H]: "Manual Exception",
  [AlertKey.COMM_QUESTION_UNREAD_96H]: "Manual Exception",
  [AlertKey.COMM_DECISION_NO_RESPONSE_72H]: "Manual Exception",
  [AlertKey.COMM_INTERNAL_NOTE_NO_FOLLOWUP_72H]: "Manual Exception",
  [AlertKey.SYSTEM_JOB_FAILED]: "Manual Exception",
  [AlertKey.SYSTEM_JOB_STALE]: "Manual Exception",
  [AlertKey.SYSTEM_STORAGE_ERROR]: "Manual Exception",
};

function mapAlertSeverity(severity: string, alertKey: string): ExceptionSeverity {
  if (severity === "CRITICAL") return "Critical";
  if (alertKey.includes("72h") || alertKey.includes("delay")) return "High";
  if (severity === "WARNING") return "Medium";
  return "Low";
}

function mapExceptionType(alertKey: string, title: string): ExceptionType {
  return ALERT_TYPE_MAP[alertKey] ?? (title.toLowerCase().includes("document") ? "Missing Document" : "Manual Exception");
}

function defaultStatus(
  type: ExceptionType,
  ownerRole: ExceptionOwnerRole | null,
  alertKey?: string,
): ExceptionStatus {
  if (alertKey === AlertKey.PO_REJECTED) return "Waiting For Buyer";
  if (type === "Missing Document" || type === "Document Rejected" || type === "Document Revision Requested") {
    return ownerRole === "SUPPLIER" ? "Waiting For Supplier" : "Waiting For Buyer";
  }
  if (type === "PO Pending" && alertKey !== AlertKey.PO_REJECTED) return "Waiting For Supplier";
  if (ownerRole === "BUYER") return "Waiting For Buyer";
  if (ownerRole === "SUPPLIER") return "Waiting For Supplier";
  return "Waiting For Operations";
}

function defaultOwnerRole(type: ExceptionType): ExceptionOwnerRole {
  if (["Missing Document", "Document Revision Requested"].includes(type)) return "SUPPLIER";
  if (["Document Rejected", "PO Pending", "Payment Pending"].includes(type)) return "BUYER";
  return "OPERATIONS";
}

function defaultRequiredAction(type: ExceptionType): string {
  const actions: Partial<Record<ExceptionType, string>> = {
    "Missing Document": "Upload requested document",
    "Document Rejected": "Review and re-upload document",
    "Document Revision Requested": "Upload revised document",
    "ETA Change": "Confirm ETA change",
    "Shipment Delay": "Review shipment update",
    "PO Pending": "Review purchase order",
    "Inspection Issue": "Acknowledge inspection report",
    "Payment Pending": "Complete payment",
  };
  return actions[type] ?? "Review exception and take action";
}

function exceptionRef(id: string): string {
  return `EXC-${id.slice(0, 8).toUpperCase()}`;
}

type Enriched = ExceptionHubRow & {
  _createdAt: Date;
  _resolvedAt?: Date | null;
  _supplierId?: string | null;
  _tradeType?: string | null;
  _carrier?: string | null;
  _workspaceId?: string;
};

export class ExceptionHubService {
  constructor(private readonly db: PrismaClient) {}

  async list(actor: AuthUser, query: ExceptionHubQuery): Promise<ExceptionHubPayload> {
    await this.syncAlertsForActor(actor);
    const all = await this.loadRows(actor);
    let filtered = applyFilters(all, query, actor.id);
    if (query.waitingForMe) {
      filtered = filtered.filter((r) =>
        r.ownerId === actor.id ||
        (r.status === "Waiting For Buyer" && actor.role === "BUYER") ||
        (r.status === "Waiting For Supplier" && actor.role === "SUPPLIER"),
      );
    }
    const kpis = computeKpis(filtered, actor.id);
    const analytics = computeAnalytics(filtered);
    const total = filtered.length;
    const items = filtered.slice(query.offset, query.offset + query.limit);
    return { kpis, analytics, items, total };
  }

  async getDetail(actor: AuthUser, id: string): Promise<ExceptionHubDetail> {
    await this.syncAlertsForActor(actor);
    const row = (await this.loadRows(actor)).find((r) => r.id === id);
    if (!row) throw new AppError(404, "EXCEPTION_NOT_FOUND");

    const ex = await this.db.tradeException.findUnique({
      where: { id },
      include: { alert: true },
    });
    if (!ex) throw new AppError(404, "EXCEPTION_NOT_FOUND");

    const ws = await this.db.workspace.findUnique({ where: { id: ex.workspaceId }, select: { externalRef: true } });
    const timeline = await this.db.timelineEvent.findMany({
      where: {
        workspaceId: ex.workspaceId,
        eventType: { startsWith: "exception." },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { displayName: true } } },
    });

    const docs = await this.db.tradeDocument.findMany({
      where: {
        workspaceId: ex.workspaceId,
        status: { in: ["MISSING", "REJECTED", "REQUESTED", "UPLOADED", "UNDER_REVIEW"] },
      },
      take: 10,
    });

    let orchestratorRecommendation = null;
    if (ex.alert?.alertKey === "order_shipment_state_mismatch" && ex.workspaceType === "ORDER") {
      const { OrderShipmentOrchestrator } = await import("../orchestration/order-shipment-orchestrator.service.js");
      const rec = await new OrderShipmentOrchestrator(this.db).latestForOrder(ex.workspaceId);
      if (rec) {
        orchestratorRecommendation = {
          id: rec.id,
          mode: rec.mode,
          rule: rec.rule,
          plan: rec.plan as Record<string, unknown>,
          createdAt: rec.createdAt.toISOString(),
        };
      }
    }

    return {
      ...row,
      title: ex.alert?.title ?? row.exceptionType,
      description: ex.alert?.description ?? row.requiredAction ?? "",
      workspaceType: ex.workspaceType,
      workspaceId: ex.workspaceId,
      workspaceRef: ws?.externalRef ?? "",
      resolutionNote: ex.resolutionNote,
      resolvedAt: ex.resolvedAt?.toISOString() ?? null,
      closedAt: ex.closedAt?.toISOString() ?? null,
      relatedDocuments: docs.map((d) => ({
        id: d.id,
        name: d.fileName ?? d.documentType,
        status: d.status,
        url: `/documents/${encodeURIComponent(`TRADE:${d.id}`)}`,
      })),
      timeline: timeline.map((e) => ({
        id: e.id,
        label: e.eventType.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        createdAt: e.createdAt.toISOString(),
        actorName: e.actor?.displayName ?? null,
      })),
      orchestratorRecommendation,
    };
  }

  async getTradeExceptions(actor: AuthUser, tradeRootId: string): Promise<TradeExceptionsPanelPayload> {
    if (!(await canAccessTrade(this.db, actor, tradeRootId))) throw new AppError(403, "FORBIDDEN");
    await this.syncAlertsForActor(actor);
    const root = await resolveTradeRoot(this.db, tradeRootId);
    if (!root) throw new AppError(404, "TRADE_NOT_FOUND");
    const rows = (await this.loadRows(actor)).filter((r) => r.tradeRootId === root.id);
    return {
      tradeId: tradeRefFromRoot(root),
      tradeRootId: root.id,
      open: rows.filter((r) => !["Resolved", "Closed"].includes(r.status)),
      resolved: rows.filter((r) => ["Resolved", "Closed"].includes(r.status)),
    };
  }

  async getShipmentExceptions(actor: AuthUser, shipmentId: string) {
    if (!(await canAccessTrade(this.db, actor, shipmentId))) throw new AppError(403, "FORBIDDEN");
    await this.syncAlertsForActor(actor);
    return (await this.loadRows(actor)).filter((r) => r._workspaceId === shipmentId);
  }

  async assign(actor: AuthUser, id: string, ownerId: string, ownerRole: ExceptionOwnerRole) {
    const ex = await this.requireAccessible(actor, id);
    if (actor.role !== "ADMIN" && actor.role !== "BUYER" && actor.id !== ex.ownerId) {
      throw new AppError(403, "FORBIDDEN");
    }
    await this.db.$transaction(async (tx) => {
      await tx.tradeException.update({
        where: { id },
        data: { ownerId, ownerRole, assignedAt: new Date(), status: "In Progress" },
      });
      await tx.timelineEvent.create({
        data: {
          workspaceId: ex.workspaceId,
          eventType: "exception.assigned",
          actorUserId: actor.id,
          payload: { exceptionId: id, ownerId, ownerRole },
        },
      });
    });
    return this.getDetail(actor, id);
  }

  async resolve(actor: AuthUser, id: string, resolutionNote: string, resolutionEta?: string) {
    const ex = await this.requireAccessible(actor, id);
    if (ex.ownerId && ex.ownerId !== actor.id && actor.role !== "ADMIN") {
      throw new AppError(403, "ONLY_ASSIGNEE_CAN_RESOLVE");
    }
    const now = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.tradeException.update({
        where: { id },
        data: {
          status: "Resolved",
          resolutionNote,
          resolutionEta: resolutionEta ? new Date(resolutionEta) : null,
          resolvedAt: now,
        },
      });
      if (ex.alertId) {
        await tx.controlTowerAlert.update({
          where: { id: ex.alertId },
          data: { resolvedAt: now, resolvedById: actor.id },
        });
      }
      await tx.timelineEvent.create({
        data: {
          workspaceId: ex.workspaceId,
          eventType: "exception.resolved",
          actorUserId: actor.id,
          payload: { exceptionId: id, resolutionNote },
        },
      });
    });
    return this.getDetail(actor, id);
  }

  async close(actor: AuthUser, id: string, note?: string) {
    const ex = await this.requireAccessible(actor, id);
    if (actor.role !== "ADMIN" && actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN");
    const now = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.tradeException.update({
        where: { id },
        data: { status: "Closed", closedAt: now, resolutionNote: note ?? ex.resolutionNote },
      });
      await tx.timelineEvent.create({
        data: {
          workspaceId: ex.workspaceId,
          eventType: "exception.closed",
          actorUserId: actor.id,
          payload: { exceptionId: id },
        },
      });
    });
    return this.getDetail(actor, id);
  }

  private async requireAccessible(actor: AuthUser, id: string) {
    const ex = await this.db.tradeException.findUnique({ where: { id } });
    if (!ex) throw new AppError(404, "EXCEPTION_NOT_FOUND");
    if (!(await canAccessTrade(this.db, actor, ex.tradeRootId))) throw new AppError(403, "FORBIDDEN");
    return ex;
  }

  private async syncAlertsForActor(actor: AuthUser) {
    if (isExceptionEngineV2Enabled()) return;

    const workspaceFilter = await this.accessibleWorkspaceFilter(actor);
    const alerts = await this.db.controlTowerAlert.findMany({
      where: { resolvedAt: null, workspaceId: { not: null }, ...workspaceFilter },
      take: 500,
      include: { workspace: { select: { externalRef: true, type: true } } },
    });

    for (const alert of alerts) {
      if (!alert.workspaceId) continue;
      const root = await resolveTradeRoot(this.db, alert.workspaceId);
      if (!root) continue;
      const type = mapExceptionType(alert.alertKey, alert.title);
      const severity = mapAlertSeverity(alert.severity, alert.alertKey);
      const ownerRole = defaultOwnerRole(type);
      const dueHours = ESCALATION_HOURS[severity];
      const dueDate = dueHours ? new Date(alert.createdAt.getTime() + dueHours * 3_600_000) : null;
      const existing = await this.db.tradeException.findUnique({ where: { alertId: alert.id } });
      const status = existing?.status && !["Resolved", "Closed"].includes(existing.status)
        ? existing.status
        : defaultStatus(type, ownerRole, alert.alertKey);

      const data = {
        exceptionType: type,
        severity: dueDate && dueDate.getTime() < Date.now() && severity !== "Critical"
          ? bumpSeverity(severity)
          : severity,
        dueDate,
        ownerRole,
        requiredAction: defaultRequiredAction(type),
        updatedAt: new Date(),
      };

      if (existing) {
        await this.db.tradeException.update({
          where: { id: existing.id },
          data: { ...data, status: existing.status === "In Progress" ? existing.status : status },
        });
      } else {
        await this.db.tradeException.create({
          data: {
            alertId: alert.id,
            tradeRootId: root.id,
            workspaceId: alert.workspaceId,
            workspaceType: alert.workspaceType,
            exceptionType: type,
            severity: data.severity,
            status,
            ownerRole,
            requiredAction: defaultRequiredAction(type),
            dueDate,
          },
        });
        await this.db.timelineEvent.create({
          data: {
            workspaceId: alert.workspaceId,
            eventType: "exception.created",
            actorUserId: null,
            payload: { alertId: alert.id, exceptionType: type },
          },
        });
      }
    }

    const stale = await this.db.tradeException.findMany({
      where: {
        status: { notIn: ["Resolved", "Closed"] },
        alertId: { not: null },
        alert: { resolvedAt: { not: null } },
      },
      select: { id: true, workspaceId: true, alertId: true },
    });
    for (const ex of stale) {
      const now = new Date();
      await this.db.tradeException.update({
        where: { id: ex.id },
        data: { status: "Closed", closedAt: now, resolvedAt: now },
      });
      await this.db.timelineEvent.create({
        data: {
          workspaceId: ex.workspaceId,
          eventType: "exception.auto_closed",
          actorUserId: null,
          payload: { exceptionId: ex.id, alertId: ex.alertId },
        },
      });
    }
  }

  private async accessibleWorkspaceFilter(actor: AuthUser): Promise<Prisma.ControlTowerAlertWhereInput> {
    if (hasPortfolioVisibility(actor.role)) return {};
    const parts = await this.db.workspaceParticipant.findMany({
      where: { userId: actor.id, leftAt: null },
      select: { workspaceId: true },
    });
    return { workspaceId: { in: parts.map((p) => p.workspaceId) } };
  }

  private async loadRows(actor: AuthUser): Promise<Enriched[]> {
    const filter = hasPortfolioVisibility(actor.role)
      ? {}
      : {
          tradeRootId: {
            in: await this.accessibleTradeRootIds(actor),
          },
        };

    const exceptions = await this.db.tradeException.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      include: { alert: { include: { workspace: { select: { externalRef: true } } } } },
    });

    if (exceptions.length === 0) return [];

    const tradeRootIds = [...new Set(exceptions.map((e) => e.tradeRootId))];
    const roots = await this.db.workspace.findMany({
      where: { id: { in: tradeRootIds } },
      select: { id: true, externalRef: true, type: true },
    });
    const rootMap = new Map(roots.map((r) => [r.id, r]));

    const workspaceIds = [...new Set(exceptions.map((e) => e.workspaceId))];
    const orderWs = await this.db.orderWorkspace.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { workspaceId: true, buyerUserId: true, supplierUserId: true, parentWorkspaceType: true },
    });
    const shipmentWs = await this.db.shipmentWorkspace.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { workspaceId: true, buyerUserId: true, supplierUserId: true, carrierName: true },
    });
    const owMap = new Map(orderWs.map((o) => [o.workspaceId, o]));
    const swMap = new Map(shipmentWs.map((s) => [s.workspaceId, s]));

    const userIds = new Set<string>();
    for (const o of orderWs) { userIds.add(o.buyerUserId); userIds.add(o.supplierUserId); }
    for (const s of shipmentWs) { userIds.add(s.buyerUserId); userIds.add(s.supplierUserId); }
    for (const e of exceptions) if (e.ownerId) userIds.add(e.ownerId);

    const users = userIds.size
      ? await this.db.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, displayName: true } })
      : [];
    const userName = new Map(users.map((u) => [u.id, u.displayName]));

    return exceptions.map((ex) => {
      const root = rootMap.get(ex.tradeRootId);
      const ow = owMap.get(ex.workspaceId);
      const sw = swMap.get(ex.workspaceId);
      const buyerId = ow?.buyerUserId ?? sw?.buyerUserId;
      const supplierId = ow?.supplierUserId ?? sw?.supplierUserId;
      const shipmentRef = ex.workspaceType === "SHIPMENT" ? ex.alert?.workspace?.externalRef ?? null : null;

      return {
        id: ex.id,
        exceptionRef: exceptionRef(ex.id),
        tradeId: root ? tradeRefFromRoot(root as Parameters<typeof tradeRefFromRoot>[0]) : null,
        tradeRootId: ex.tradeRootId,
        tradeWorkspaceUrl: `/workspace/trade/${ex.tradeRootId}`,
        exceptionType: ex.exceptionType as ExceptionType,
        severity: ex.severity as ExceptionSeverity,
        status: ex.status as ExceptionStatus,
        buyerName: buyerId ? userName.get(buyerId) ?? null : null,
        supplierName: supplierId ? userName.get(supplierId) ?? null : null,
        shipmentRef,
        createdAt: ex.createdAt.toISOString(),
        ownerName: ex.ownerId ? userName.get(ex.ownerId) ?? null : null,
        ownerId: ex.ownerId,
        ownerRole: ex.ownerRole as ExceptionOwnerRole | null,
        dueDate: ex.dueDate?.toISOString() ?? null,
        resolutionEta: ex.resolutionEta?.toISOString() ?? null,
        requiredAction: ex.requiredAction,
        alertId: ex.alertId,
        detailUrl: `/exceptions/${ex.id}`,
        _workspaceId: ex.workspaceId,
        _createdAt: ex.createdAt,
        _resolvedAt: ex.resolvedAt,
        _supplierId: supplierId,
        _tradeType: ow?.parentWorkspaceType ?? root?.type ?? null,
        _carrier: sw?.carrierName ?? null,
      };
    });
  }

  private async accessibleTradeRootIds(actor: AuthUser): Promise<string[]> {
    const parts = await this.db.workspaceParticipant.findMany({
      where: { userId: actor.id, leftAt: null },
      select: { workspaceId: true },
    });
    const rootIds = new Set<string>();
    for (const p of parts) {
      const root = await resolveTradeRoot(this.db, p.workspaceId);
      if (root) rootIds.add(root.id);
    }
    return [...rootIds];
  }
}

function bumpSeverity(severity: ExceptionSeverity): ExceptionSeverity {
  if (severity === "Low") return "Medium";
  if (severity === "Medium") return "High";
  return "Critical";
}

function applyFilters(rows: Enriched[], query: ExceptionHubQuery, actorId: string): Enriched[] {
  let out = rows;
  if (query.severity) out = out.filter((r) => r.severity === query.severity);
  if (query.status) out = out.filter((r) => r.status === query.status);
  if (query.exceptionType) out = out.filter((r) => r.exceptionType === query.exceptionType);
  if (query.ownerId) out = out.filter((r) => r.ownerId === query.ownerId);
  if (query.supplierId) out = out.filter((r) => r._supplierId === query.supplierId);
  if (query.tradeType) out = out.filter((r) => r._tradeType === query.tradeType);
  if (query.dateFrom) {
    const from = new Date(query.dateFrom).getTime();
    out = out.filter((r) => r._createdAt.getTime() >= from);
  }
  if (query.dateTo) {
    const to = new Date(query.dateTo).getTime();
    out = out.filter((r) => r._createdAt.getTime() <= to);
  }
  if (query.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    out = out.filter((r) =>
      r.exceptionRef.toLowerCase().includes(q) ||
      (r.tradeId ?? "").toLowerCase().includes(q) ||
      (r.shipmentRef ?? "").toLowerCase().includes(q) ||
      (r.supplierName ?? "").toLowerCase().includes(q) ||
      (r.buyerName ?? "").toLowerCase().includes(q),
    );
  }
  void actorId;
  return out;
}

function computeKpis(rows: Enriched[], actorId: string): ExceptionHubKpis {
  const weekAgo = Date.now() - 7 * 86_400_000;
  const open = rows.filter((r) => !["Resolved", "Closed"].includes(r.status));
  const resolvedWeek = rows.filter((r) => r._resolvedAt && r._resolvedAt.getTime() >= weekAgo);
  const resolvedAll = rows.filter((r) => r._resolvedAt);
  const avgHours = resolvedAll.length
    ? resolvedAll.reduce((s, r) => s + (r._resolvedAt!.getTime() - r._createdAt.getTime()) / 3_600_000, 0) / resolvedAll.length
    : null;

  const typeCounts = new Map<string, number>();
  for (const r of open) typeCounts.set(r.exceptionType, (typeCounts.get(r.exceptionType) ?? 0) + 1);

  return {
    openExceptions: open.length,
    criticalExceptions: open.filter((r) => r.severity === "Critical").length,
    myPendingActions: open.filter((r) =>
      r.ownerId === actorId ||
      r.status === "Waiting For Buyer" ||
      r.status === "Waiting For Supplier",
    ).length,
    resolvedThisWeek: resolvedWeek.length,
    averageResolutionHours: avgHours != null ? Math.round(avgHours * 10) / 10 : null,
    exceptionsByType: [...typeCounts.entries()].map(([type, count]) => ({
      type: type as ExceptionType,
      count,
    })),
  };
}

function computeAnalytics(rows: Enriched[]): ExceptionHubAnalytics {
  const open = rows.filter((r) => !["Resolved", "Closed"].includes(r.status));
  const resolved = rows.filter((r) => r._resolvedAt);
  const avgHours = resolved.length
    ? resolved.reduce((s, r) => s + (r._resolvedAt!.getTime() - r._createdAt.getTime()) / 3_600_000, 0) / resolved.length
    : null;

  const bySupplier = new Map<string, number>();
  const byCarrier = new Map<string, number>();
  const byTradeType = new Map<string, number>();
  for (const r of open) {
    if (r.supplierName) bySupplier.set(r.supplierName, (bySupplier.get(r.supplierName) ?? 0) + 1);
    if (r._carrier) byCarrier.set(r._carrier, (byCarrier.get(r._carrier) ?? 0) + 1);
    if (r._tradeType) byTradeType.set(r._tradeType, (byTradeType.get(r._tradeType) ?? 0) + 1);
  }

  return {
    openExceptions: open.length,
    averageResolutionHours: avgHours != null ? Math.round(avgHours * 10) / 10 : null,
    exceptionRate: rows.length > 0 ? Math.round((open.length / rows.length) * 1000) / 10 : null,
    bySupplier: [...bySupplier.entries()].map(([name, count]) => ({ name, count })).slice(0, 10),
    byCarrier: [...byCarrier.entries()].map(([name, count]) => ({ name, count })).slice(0, 10),
    byTradeType: [...byTradeType.entries()].map(([type, count]) => ({ type, count })),
  };
}

export function shipmentExceptionSummary(exceptions: ExceptionHubRow[]): {
  count: number;
  highestSeverity: ExceptionSeverity | null;
  status: string;
  primaryDetailUrl: string | null;
} {
  const open = exceptions.filter((e) => !["Resolved", "Closed"].includes(e.status));
  if (open.length === 0) return { count: 0, highestSeverity: null, status: "None", primaryDetailUrl: null };
  const order = ["Critical", "High", "Medium", "Low"];
  const sorted = [...open].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const highest = sorted[0]!.severity;
  return {
    count: open.length,
    highestSeverity: highest,
    status: sorted[0]?.status ?? "Open",
    primaryDetailUrl: sorted[0]?.detailUrl ?? null,
  };
}
