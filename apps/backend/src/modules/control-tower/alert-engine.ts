import { Prisma, type PrismaClient } from "@prisma/client";
import { invalidateCache } from "../../lib/response-cache.js";
import { AlertKey } from "@dmx/contracts/control-tower";
import {
  evaluateOrderShipmentDesync,
  alertSeverityFromDesync,
  TERMINAL_ORDER_STATES,
  TERMINAL_SHIPMENT_STATES,
} from "@dmx/contracts/order-shipment-orchestration";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { toAlertDto } from "./control-tower.mapper.js";
import { isTestWorkspace, resolveOpenAlertsForTestWorkspaces } from "./test-workspace.js";

const H = 3_600_000;
const RFQ_SUBMITTED_MAX_AGE_MS = 24 * H;
const DEADLINE_NEAR_MS = 48 * H;
const ORDER_INACTIVE_MS = 48 * H;
const PRODUCTION_STALL_MS = 72 * H;
const INSPECTION_SLA_MS = 5 * 24 * H;
const CUSTOMS_STUCK_MS = 72 * H;

interface UpsertInput {
  severity: string;
  category: string;
  alertKey: string;
  workspaceId: string;
  workspaceType: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export class AlertEngine {
  constructor(private readonly db: PrismaClient) {}

  async runFullScan(opts?: { preserveTestWorkspaces?: boolean }): Promise<number> {
    if (!opts?.preserveTestWorkspaces) {
      await resolveOpenAlertsForTestWorkspaces(this.db);
    }
    let created = 0;
    created += await this.scanRfq();
    created += await this.scanCommodityBid();
    created += await this.scanOrder();
    created += await this.scanShipment();
    created += await this.scanOrderShipmentDesync();
    const { scanFreightAlerts } = await import("../freightiq/freightiq-alerts.js");
    created += await scanFreightAlerts(this.db);
    const { scanFreightEstimateAlerts } = await import("../freight-estimate/freight-estimate-alerts.js");
    created += await scanFreightEstimateAlerts(this.db);
    const { scanFreightBookingAlerts } = await import("../freight-booking/freight-booking-alerts.js");
    created += await scanFreightBookingAlerts(this.db);
    const { scanTradeDocumentAlerts } = await import("../trade-documents/trade-documents-alerts.js");
    created += await scanTradeDocumentAlerts(this.db);
    const { scanPurchaseOrderAlerts } = await import("../purchase-order/purchase-order-alerts.js");
    created += await scanPurchaseOrderAlerts(this.db);
    const { scanWorkspaceCommunicationAlerts } = await import("../workspace-communication/communication-alerts.js");
    created += await scanWorkspaceCommunicationAlerts(this.db);
    const { scanScaleReadinessAlerts } = await import("../scale-readiness/scale-alerts.js");
    created += await scanScaleReadinessAlerts(this.db);
    const { scanGrowthAlerts } = await import("../growth-engine/growth-alerts.js");
    created += await scanGrowthAlerts(this.db);
    const { scanMarketAlerts } = await import("../market-intelligence/market-alerts.js");
    created += await scanMarketAlerts(this.db);
    const { scanSystemAlerts } = await import("../jobs/system-alerts.js");
    created += await scanSystemAlerts(this.db);
    const { scanOnboardingAlerts } = await import("../onboarding/onboarding-alerts.js");
    created += await scanOnboardingAlerts(this.db);
    const { scanMixedContainerAlerts } = await import("../mixed-container/mixed-container-alerts.js");
    created += await scanMixedContainerAlerts(this.db);
    const { scanBulkContainerAlerts } = await import("../bulk-container/bulk-container-alerts.js");
    created += await scanBulkContainerAlerts(this.db);
    const { scanPackingAlerts } = await import("../packing-type/packing-alerts.js");
    created += await scanPackingAlerts(this.db);
    await this.autoResolveStale();
    invalidateCache("control-tower:");
    invalidateCache("growth:");
    invalidateCache("market:");
    return created;
  }

  private async upsertOpenAlert(input: UpsertInput): Promise<boolean> {
    if (await isTestWorkspace(this.db, input.workspaceId)) return false;
    const existing = await this.db.controlTowerAlert.findFirst({
      where: {
        workspaceId: input.workspaceId,
        alertKey: input.alertKey,
        resolvedAt: null,
      },
    });
    if (existing) return false;

    try {
      const row = await this.db.controlTowerAlert.create({
        data: {
          ...input,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
        include: { workspace: { select: { externalRef: true } } },
      });
      socketBus.emitToRole("ADMIN", SocketEvents.CONTROL_TOWER_ALERT_CREATED, {
        alert: toAlertDto(row),
      });
      if (input.alertKey === AlertKey.ORDER_SHIPMENT_STATE_MISMATCH && input.metadata) {
        void this.enqueueOrchestratorFromAlert(input.workspaceId, input.metadata).catch(() => {});
      }
      void this.enqueueExceptionCase(row).catch(() => {});
      return true;
    } catch {
      // Unique partial index race — treat as already open.
      return false;
    }
  }

  private async autoResolveStale(): Promise<void> {
    const open = await this.db.controlTowerAlert.findMany({
      where: { resolvedAt: null, workspaceId: { not: null } },
      include: { workspace: { select: { id: true, state: true, type: true } } },
      take: 200,
    });

    for (const alert of open) {
      const ws = alert.workspace;
      if (!ws) continue;
      const still = await this.conditionStillActive(alert.alertKey, ws.id, ws.state, ws.type);
      if (!still) {
        const resolved = await this.db.controlTowerAlert.update({
          where: { id: alert.id },
          data: { resolvedAt: new Date(), resolvedById: null },
        });
        socketBus.emitToRole("ADMIN", SocketEvents.CONTROL_TOWER_ALERT_RESOLVED, {
          alertId: resolved.id,
          resolvedAt: resolved.resolvedAt!.toISOString(),
        });
      }
    }
  }

  private async conditionStillActive(
    alertKey: string,
    workspaceId: string,
    state: string,
    type: string,
  ): Promise<boolean> {
    const now = new Date();
    switch (alertKey) {
      case AlertKey.RFQ_SUBMITTED_UNASSIGNED:
        if (state !== "RFQ_SUBMITTED") return false;
        return (await this.db.supplierAssignment.count({ where: { workspaceId } })) === 0;
      case AlertKey.RFQ_OPEN_NO_QUOTES_DEADLINE: {
        if (state !== "RFQ_OPEN") return false;
        const ws = await this.db.workspace.findUnique({ where: { id: workspaceId } });
        if (!ws?.deadlineAt) return false;
        const quotes = await this.db.quotation.count({ where: { workspaceId, status: { not: "WITHDRAWN" } } });
        return quotes === 0 && ws.deadlineAt.getTime() - now.getTime() < DEADLINE_NEAR_MS;
      }
      case AlertKey.RFQ_PROFORMA_SLA_PAST: {
        if (state !== "PROFORMA_REQUESTED") return false;
        const ws = await this.db.workspace.findUnique({ where: { id: workspaceId } });
        return !!ws?.proformaSlaDeadlineAt && ws.proformaSlaDeadlineAt <= now;
      }
      case AlertKey.CB_OPEN_NO_BIDS_DEADLINE: {
        if (state !== "LIVE") return false;
        const ws = await this.db.workspace.findUnique({ where: { id: workspaceId } });
        if (!ws?.deadlineAt) return false;
        const bids = await this.db.commodityBidSubmission.count({
          where: { workspaceId, withdrawnAt: null },
        });
        return bids === 0 && ws.deadlineAt.getTime() - now.getTime() < DEADLINE_NEAR_MS;
      }
      case AlertKey.CB_AWARD_ACCEPTANCE_OVERDUE:
        return state === "AWAITING_BUYER_APPROVAL";
      case AlertKey.CB_AWAITING_BUYER_APPROVAL:
        return state === "AWAITING_BUYER_APPROVAL";
      case AlertKey.CB_AUCTION_FAILED:
        return state === "EXPIRED" || state === "CLOSED_NO_AWARD";
      case AlertKey.CB_REJECTED:
        return state === "REJECTED";
      case AlertKey.CB_AUCTION_CLOSED:
        return state === "CLOSED" || state === "WINNER_IDENTIFIED";
      case AlertKey.CB_NO_SUPPLIERS_JOINED: {
        if (state !== "LIVE") return false;
        const joined = await this.db.commodityBidInvitation.count({
          where: { workspaceId, removedAt: null, joinedAt: { not: null } },
        });
        return joined === 0;
      }
      case AlertKey.CB_LOW_PARTICIPATION: {
        if (state !== "LIVE") return false;
        const invited = await this.db.commodityBidInvitation.count({ where: { workspaceId, removedAt: null } });
        const joined = await this.db.commodityBidInvitation.count({
          where: { workspaceId, removedAt: null, joinedAt: { not: null } },
        });
        return invited >= 2 && joined < Math.ceil(invited / 2);
      }
      case AlertKey.ORDER_CREATED_INACTIVE:
        return state === "ORDER_CREATED" && (await this.staleUpdated(workspaceId, ORDER_INACTIVE_MS));
      case AlertKey.ORDER_PRODUCTION_STALLED:
        return ["PRODUCTION_STARTED", "PRODUCTION_IN_PROGRESS"].includes(state)
          && (await this.staleUpdated(workspaceId, PRODUCTION_STALL_MS));
      case AlertKey.ORDER_INSPECTION_SLA_PAST: {
        if (state !== "INSPECTION_REQUESTED") return false;
        const ow = await this.db.orderWorkspace.findUnique({ where: { workspaceId } });
        if (!ow?.inspectionRequestedAt || ow.inspectionCompletedAt) return false;
        return ow.inspectionRequestedAt.getTime() + INSPECTION_SLA_MS <= now.getTime();
      }
      case AlertKey.SHIPMENT_ETA_EXCEEDED:
        return await this.shipmentEtaExceeded(workspaceId, state);
      case AlertKey.SHIPMENT_CUSTOMS_STUCK: {
        if (state !== "CUSTOMS_CLEARANCE") return false;
        const sw = await this.db.shipmentWorkspace.findUnique({ where: { workspaceId } });
        return !!sw?.customsStartedAt && !sw.customsCompletedAt
          && sw.customsStartedAt.getTime() + CUSTOMS_STUCK_MS <= now.getTime();
      }
      case AlertKey.SHIPMENT_EXCEPTION:
        return type === "SHIPMENT" && state === "EXCEPTION";
      case AlertKey.ORDER_SHIPMENT_STATE_MISMATCH: {
        if (type !== "ORDER") return false;
        const shipment = await this.db.workspace.findFirst({
          where: { spawnedFromId: workspaceId, type: "SHIPMENT" },
          orderBy: { createdAt: "desc" },
          select: { state: true },
        });
        if (!shipment || TERMINAL_SHIPMENT_STATES.includes(shipment.state as never)) return false;
        return evaluateOrderShipmentDesync(state, shipment.state) !== null;
      }
      case AlertKey.PO_REJECTED: {
        const po = await this.db.purchaseOrder.findFirst({
          where: { orderId: workspaceId, status: "CANCELLED" },
        });
        if (!po) return false;
        const rejected = await this.db.purchaseOrderAcknowledgement.findFirst({
          where: { purchaseOrderId: po.id, status: "REJECTED" },
        });
        return !!rejected;
      }
      case AlertKey.PO_CANCELLED: {
        const po = await this.db.purchaseOrder.findFirst({
          where: { orderId: workspaceId, status: "CANCELLED" },
        });
        if (!po) return false;
        const rejected = await this.db.purchaseOrderAcknowledgement.findFirst({
          where: { purchaseOrderId: po.id, status: "REJECTED" },
        });
        return !rejected;
      }
      case AlertKey.PO_NO_ACK_72H: {
        const po = await this.db.purchaseOrder.findFirst({
          where: { orderId: workspaceId, status: "ISSUED" },
        });
        if (!po) return false;
        const accepted = await this.db.purchaseOrderAcknowledgement.findFirst({
          where: { purchaseOrderId: po.id, status: "ACCEPTED" },
        });
        return !accepted;
      }
      case AlertKey.PO_AMENDMENT_OPEN_72H: {
        const po = await this.db.purchaseOrder.findFirst({ where: { orderId: workspaceId } });
        if (!po) return false;
        const open = await this.db.purchaseOrderAmendment.count({
          where: { purchaseOrderId: po.id, status: "OPEN" },
        });
        return open > 0;
      }
      case AlertKey.TRADE_DOC_REJECTED: {
        const rejected = await this.db.tradeDocument.count({
          where: { workspaceId, status: "REJECTED" },
        });
        return rejected > 0;
      }
      case AlertKey.TRADE_DOC_REQUIRED_MISSING:
      case AlertKey.TRADE_DOC_MISSING_72H: {
        const requirements = await this.db.documentRequirement.findMany({
          where: { workspaceId, required: true },
        });
        if (requirements.length === 0) return false;
        for (const req of requirements) {
          const doc = await this.db.tradeDocument.findUnique({
            where: {
              workspaceType_workspaceId_documentType: {
                workspaceType: req.workspaceType,
                workspaceId: req.workspaceId,
                documentType: req.documentType,
              },
            },
          });
          if (!doc || doc.status === "MISSING" || doc.status === "REQUESTED" || doc.status === "UPLOADED" || doc.status === "UNDER_REVIEW") return true;
        }
        return false;
      }
      case AlertKey.TRADE_DOC_DELIVERED_INCOMPLETE: {
        if (type !== "SHIPMENT" || state !== "DELIVERED") return false;
        const requirements = await this.db.documentRequirement.findMany({
          where: { workspaceId, required: true },
        });
        const approved = await this.db.tradeDocument.findMany({
          where: { workspaceId, status: "APPROVED" },
        });
        const approvedSet = new Set(approved.map((d) => d.documentType));
        return requirements.some((r) => !approvedSet.has(r.documentType));
      }
      case AlertKey.FREIGHT_ESTIMATE_EXPIRING_SOON: {
        const expiring = await this.db.freightEstimate.findFirst({
          where: {
            tradeId: workspaceId,
            status: "ACTIVE",
            expiresAt: { gt: now, lte: new Date(now.getTime() + 48 * 3_600_000) },
          },
        });
        return !!expiring;
      }
      case AlertKey.FREIGHT_ESTIMATE_EXPIRED: {
        const active = await this.db.freightEstimate.findFirst({
          where: { tradeId: workspaceId, status: "ACTIVE", expiresAt: { gt: now } },
        });
        return !active;
      }
      case AlertKey.FREIGHT_ESTIMATE_REFRESH_REQUIRED: {
        const poReadyStates = [
          "SUPPLIER_SELECTED",
          "PROFORMA_REQUESTED",
          "PROFORMA_RECEIVED",
          "PROFORMA_APPROVED",
          "WINNER_IDENTIFIED",
          "AWAITING_BUYER_APPROVAL",
          "APPROVED",
          "MC_EXECUTION_READY",
          "BC_EXECUTION_READY",
          "MC_BUYER_REVIEW",
          "MC_APPROVED",
          "BC_BUYER_REVIEW",
          "BC_APPROVED",
        ];
        if (!poReadyStates.includes(state)) return false;
        const active = await this.db.freightEstimate.findFirst({
          where: { tradeId: workspaceId, status: "ACTIVE", expiresAt: { gt: now } },
        });
        if (active) return false;
        const hadEstimate = await this.db.freightEstimate.findFirst({
          where: { tradeId: workspaceId },
          orderBy: { estimatedAt: "desc" },
        });
        return !!hadEstimate;
      }
      case AlertKey.BOOKING_CUTOFF_RISK: {
        const booking = await this.db.freightBooking.findFirst({
          where: { tradeId: workspaceId, status: { in: ["UNDER_REVIEW", "APPROVED", "REBOOK_REQUIRED"] } },
          include: { carrierOptions: { where: { status: { in: ["AVAILABLE", "RECOMMENDED", "SELECTED"] } } } },
        });
        if (!booking) return false;
        const cutoffSoon = new Date(now.getTime() + 3 * 86_400_000);
        return booking.carrierOptions.some((o) => o.cutoffDate <= cutoffSoon);
      }
      case AlertKey.BOOKING_NOT_CONFIRMED: {
        const booking = await this.db.freightBooking.findFirst({
          where: { tradeId: workspaceId, status: "APPROVED" },
        });
        if (!booking?.approvedAt) return false;
        return booking.approvedAt.getTime() + 5 * 86_400_000 <= now.getTime();
      }
      case AlertKey.BOOKING_REBOOKING_REQUIRED: {
        const booking = await this.db.freightBooking.findFirst({
          where: { tradeId: workspaceId, status: "REBOOK_REQUIRED" },
        });
        return !!booking;
      }
      case AlertKey.BOOKING_FORECAST_CHANGED: {
        const revised = await this.db.cargoReadyForecast.findFirst({
          where: { tradeId: workspaceId, status: "REVISED", updatedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
        });
        if (!revised) return false;
        const active = await this.db.cargoReadyForecast.findFirst({
          where: { tradeId: workspaceId, status: "ACTIVE" },
        });
        return !!active;
      }
      default:
        return false;
    }
  }

  private async staleUpdated(workspaceId: string, maxAgeMs: number): Promise<boolean> {
    const ws = await this.db.workspace.findUnique({ where: { id: workspaceId }, select: { updatedAt: true } });
    if (!ws) return false;
    return ws.updatedAt.getTime() + maxAgeMs <= Date.now();
  }

  private async shipmentEtaExceeded(workspaceId: string, state: string): Promise<boolean> {
    if (state !== "IN_TRANSIT") return false;
    const sw = await this.db.shipmentWorkspace.findUnique({ where: { workspaceId } });
    if (!sw) return false;
    const order = await this.db.orderWorkspace.findFirst({
      where: { workspaceId: sw.orderWorkspaceId },
      select: { currentEta: true },
    });
    return !!order?.currentEta && order.currentEta <= new Date();
  }

  async scanRfq(): Promise<number> {
    const now = new Date();
    let n = 0;
    const submittedCutoff = new Date(now.getTime() - RFQ_SUBMITTED_MAX_AGE_MS);
    const submitted = await this.db.workspace.findMany({
      where: { type: "RFQ", state: "RFQ_SUBMITTED", updatedAt: { lte: submittedCutoff } },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of submitted) {
      const assigned = await this.db.supplierAssignment.count({ where: { workspaceId: ws.id } });
      if (assigned > 0) continue;
      if (await this.upsertOpenAlert({
        severity: "WARNING",
        category: "RFQ",
        alertKey: AlertKey.RFQ_SUBMITTED_UNASSIGNED,
        workspaceId: ws.id,
        workspaceType: "RFQ",
        title: "RFQ awaiting supplier assignment",
        description: `${ws.externalRef} has been submitted for over 24 hours without supplier assignment.`,
      })) n++;
    }

    const deadlineSoon = new Date(now.getTime() + DEADLINE_NEAR_MS);
    const openRfq = await this.db.workspace.findMany({
      where: {
        type: "RFQ",
        state: "RFQ_OPEN",
        deadlineAt: { lte: deadlineSoon, gt: now },
      },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of openRfq) {
      const quotes = await this.db.quotation.count({
        where: { workspaceId: ws.id, status: { not: "WITHDRAWN" } },
      });
      if (quotes > 0) continue;
      if (await this.upsertOpenAlert({
        severity: "WARNING",
        category: "RFQ",
        alertKey: AlertKey.RFQ_OPEN_NO_QUOTES_DEADLINE,
        workspaceId: ws.id,
        workspaceType: "RFQ",
        title: "RFQ open with no quotations",
        description: `${ws.externalRef} has no quotations and deadline is within 48 hours.`,
      })) n++;
    }

    const proformaLate = await this.db.workspace.findMany({
      where: {
        type: "RFQ",
        state: "PROFORMA_REQUESTED",
        proformaSlaDeadlineAt: { lte: now },
      },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of proformaLate) {
      if (await this.upsertOpenAlert({
        severity: "CRITICAL",
        category: "RFQ",
        alertKey: AlertKey.RFQ_PROFORMA_SLA_PAST,
        workspaceId: ws.id,
        workspaceType: "RFQ",
        title: "Proforma SLA exceeded",
        description: `${ws.externalRef} is past the proforma response SLA.`,
      })) n++;
    }
    return n;
  }

  async scanCommodityBid(): Promise<number> {
    const now = new Date();
    let n = 0;
    const deadlineSoon = new Date(now.getTime() + DEADLINE_NEAR_MS);
    const openBids = await this.db.workspace.findMany({
      where: {
        type: "COMMODITYBID",
        state: "BID_OPEN",
        deadlineAt: { lte: deadlineSoon, gt: now },
      },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of openBids) {
      const bids = await this.db.commodityBidSubmission.count({
        where: { workspaceId: ws.id, withdrawnAt: null },
      });
      if (bids > 0) continue;
      if (await this.upsertOpenAlert({
        severity: "WARNING",
        category: "COMMODITYBID",
        alertKey: AlertKey.CB_OPEN_NO_BIDS_DEADLINE,
        workspaceId: ws.id,
        workspaceType: "COMMODITYBID",
        title: "CommodityBid open with no bids",
        description: `${ws.externalRef} has no bids and deadline is within 48 hours.`,
      })) n++;
    }

    const awardOverdue = await this.db.workspace.findMany({
      where: { type: "COMMODITYBID", state: "AWARDS_PUBLISHED" },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of awardOverdue) {
      const overdue = await this.db.commodityBidAward.count({
        where: { workspaceId: ws.id, status: "PUBLISHED", slaDeadlineAt: { lte: now } },
      });
      if (overdue === 0) continue;
      if (await this.upsertOpenAlert({
        severity: "CRITICAL",
        category: "COMMODITYBID",
        alertKey: AlertKey.CB_AWARD_ACCEPTANCE_OVERDUE,
        workspaceId: ws.id,
        workspaceType: "COMMODITYBID",
        title: "Award acceptance overdue",
        description: `${ws.externalRef} has published awards past acceptance SLA.`,
      })) n++;
    }
    return n;
  }

  async scanOrder(): Promise<number> {
    let n = 0;
    const inactiveCutoff = new Date(Date.now() - ORDER_INACTIVE_MS);
    const created = await this.db.workspace.findMany({
      where: { type: "ORDER", state: "ORDER_CREATED", updatedAt: { lte: inactiveCutoff } },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of created) {
      if (await this.upsertOpenAlert({
        severity: "WARNING",
        category: "ORDER",
        alertKey: AlertKey.ORDER_CREATED_INACTIVE,
        workspaceId: ws.id,
        workspaceType: "ORDER",
        title: "Order awaiting supplier confirmation",
        description: `${ws.externalRef} has had no activity for over 48 hours since creation.`,
      })) n++;
    }

    const prodCutoff = new Date(Date.now() - PRODUCTION_STALL_MS);
    const production = await this.db.workspace.findMany({
      where: {
        type: "ORDER",
        state: { in: ["PRODUCTION_STARTED", "PRODUCTION_IN_PROGRESS"] },
        updatedAt: { lte: prodCutoff },
      },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of production) {
      if (await this.upsertOpenAlert({
        severity: "WARNING",
        category: "ORDER",
        alertKey: AlertKey.ORDER_PRODUCTION_STALLED,
        workspaceId: ws.id,
        workspaceType: "ORDER",
        title: "Production stalled",
        description: `${ws.externalRef} production has had no updates for over 72 hours.`,
      })) n++;
    }

    const inspectionCutoff = new Date(Date.now() - INSPECTION_SLA_MS);
    const inspections = await this.db.orderWorkspace.findMany({
      where: {
        inspectionRequestedAt: { lte: inspectionCutoff },
        inspectionCompletedAt: null,
        workspace: { state: "INSPECTION_REQUESTED" },
      },
      include: { workspace: { select: { id: true, externalRef: true } } },
      take: 50,
    });
    for (const ow of inspections) {
      if (await this.upsertOpenAlert({
        severity: "CRITICAL",
        category: "ORDER",
        alertKey: AlertKey.ORDER_INSPECTION_SLA_PAST,
        workspaceId: ow.workspaceId,
        workspaceType: "ORDER",
        title: "Inspection SLA exceeded",
        description: `${ow.workspace.externalRef} inspection has been pending beyond SLA.`,
      })) n++;
    }
    return n;
  }

  async scanShipment(): Promise<number> {
    const now = new Date();
    let n = 0;

    const inTransit = await this.db.workspace.findMany({
      where: { type: "SHIPMENT", state: "IN_TRANSIT" },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of inTransit) {
      const sw = await this.db.shipmentWorkspace.findUnique({ where: { workspaceId: ws.id } });
      if (!sw) continue;
      const order = await this.db.orderWorkspace.findFirst({
        where: { workspaceId: sw.orderWorkspaceId },
        select: { currentEta: true },
      });
      if (!order?.currentEta || order.currentEta > now) continue;
      if (await this.upsertOpenAlert({
        severity: "CRITICAL",
        category: "SHIPMENT",
        alertKey: AlertKey.SHIPMENT_ETA_EXCEEDED,
        workspaceId: ws.id,
        workspaceType: "SHIPMENT",
        title: "Shipment ETA exceeded",
        description: `${ws.externalRef} is in transit past the recorded ETA.`,
      })) n++;
    }

    const customsCutoff = new Date(now.getTime() - CUSTOMS_STUCK_MS);
    const customs = await this.db.shipmentWorkspace.findMany({
      where: {
        customsStartedAt: { lte: customsCutoff },
        customsCompletedAt: null,
        workspace: { state: "CUSTOMS_CLEARANCE" },
      },
      include: { workspace: { select: { id: true, externalRef: true } } },
      take: 50,
    });
    for (const sw of customs) {
      if (await this.upsertOpenAlert({
        severity: "WARNING",
        category: "SHIPMENT",
        alertKey: AlertKey.SHIPMENT_CUSTOMS_STUCK,
        workspaceId: sw.workspaceId,
        workspaceType: "SHIPMENT",
        title: "Customs clearance delayed",
        description: `${sw.workspace.externalRef} has been in customs clearance over 72 hours.`,
      })) n++;
    }

    const exceptions = await this.db.workspace.findMany({
      where: { type: "SHIPMENT", state: "EXCEPTION" },
      select: { id: true, externalRef: true },
      take: 50,
    });
    for (const ws of exceptions) {
      if (await this.upsertOpenAlert({
        severity: "CRITICAL",
        category: "SHIPMENT",
        alertKey: AlertKey.SHIPMENT_EXCEPTION,
        workspaceId: ws.id,
        workspaceType: "SHIPMENT",
        title: "Shipment exception",
        description: `${ws.externalRef} is in EXCEPTION state and requires operations review.`,
      })) n++;
    }
    return n;
  }

  async scanOrderShipmentDesync(): Promise<number> {
    const orders = await this.db.workspace.findMany({
      where: { type: "ORDER", state: { notIn: [...TERMINAL_ORDER_STATES] } },
      select: { id: true, externalRef: true, state: true },
      take: 100,
    });

    let n = 0;
    for (const order of orders) {
      const shipment = await this.db.workspace.findFirst({
        where: { spawnedFromId: order.id, type: "SHIPMENT" },
        orderBy: { createdAt: "desc" },
        select: { id: true, externalRef: true, state: true },
      });
      if (!shipment || TERMINAL_SHIPMENT_STATES.includes(shipment.state as never)) continue;

      const hit = evaluateOrderShipmentDesync(order.state, shipment.state);
      if (!hit) continue;

      if (await this.upsertOpenAlert({
        severity: alertSeverityFromDesync(hit.severity),
        category: "ORDER",
        alertKey: AlertKey.ORDER_SHIPMENT_STATE_MISMATCH,
        workspaceId: order.id,
        workspaceType: "ORDER",
        title: "Order/shipment state mismatch",
        description: `${order.externalRef} (${order.state}) vs shipment ${shipment.externalRef} (${shipment.state}) [${hit.rule}]`,
        metadata: {
          rule: hit.rule,
          orderId: order.id,
          shipmentId: shipment.id,
          orderState: order.state,
          shipmentState: shipment.state,
          laggingEntity: hit.laggingEntity,
        },
      })) n++;
    }
    return n;
  }

  private async enqueueOrchestratorFromAlert(
    orderId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const { isOrchestratorEnabled } = await import("../../config/orchestrator.js");
    if (!isOrchestratorEnabled()) return;
    const { OrderShipmentOrchestrator } = await import("../orchestration/order-shipment-orchestrator.service.js");
    const orch = new OrderShipmentOrchestrator(this.db);
    await orch.planFromDesyncAlert({
      orderId: String(metadata.orderId ?? orderId),
      shipmentId: String(metadata.shipmentId),
      orderState: String(metadata.orderState),
      shipmentState: String(metadata.shipmentState),
      rule: String(metadata.rule),
      laggingEntity: metadata.laggingEntity as "ORDER" | "SHIPMENT",
    });
  }

  private async enqueueExceptionCase(alert: {
    id: string;
    alertKey: string;
    workspaceId: string | null;
    workspaceType: string | null;
    severity: string;
    title: string;
  }): Promise<void> {
    if (!alert.workspaceId) return;
    const { ExceptionEngineService } = await import("../exception-engine/exception-engine.service.js");
    const ws = await this.db.workspace.findUnique({
      where: { id: alert.workspaceId },
      select: { spawnedFromId: true },
    });
    const tradeRootId = ws?.spawnedFromId ?? alert.workspaceId;
    await new ExceptionEngineService(this.db).upsertFromAlert({
      alertId: alert.id,
      alertKey: alert.alertKey,
      workspaceId: alert.workspaceId,
      workspaceType: alert.workspaceType ?? "ORDER",
      severity: alert.severity,
      title: alert.title,
      tradeRootId,
    });
  }
}
