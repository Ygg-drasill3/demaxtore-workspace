import type { PrismaClient } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import type { SystemEventType } from "@dmx/contracts/conversation-hub";
import { logger } from "../../config/logger.js";

const EVENT_LABELS: Record<string, string> = {
  WORKSPACE_CREATED: "Workspace created",
  RFQ_PUBLISHED: "RFQ published to suppliers",
  QUOTATION_SUBMITTED: "Quotation submitted",
  SUPPLIER_SELECTED: "Supplier selected",
  COMMODITYBID_CLOSED: "CommodityBid closed",
  PURCHASE_ORDER_ISSUED: "Purchase order issued",
  INSPECTION_SCHEDULED: "Inspection scheduled",
  SHIPMENT_BOOKED: "Shipment booked",
  ETA_UPDATED: "ETA updated",
  SHIPMENT_DELIVERED: "Shipment delivered",
};

/** Maps FSM audit events to Conversation Hub system events (workspace-type scoped). */
const FSM_AUDIT_MAP: Record<string, SystemEventType> = {
  "RFQ:rfq.published": "RFQ_PUBLISHED",
  "RFQ:rfq.supplier.selected": "SUPPLIER_SELECTED",
  "RFQ:po.issued": "PURCHASE_ORDER_ISSUED",
  "ORDER:order.inspection.requested": "INSPECTION_SCHEDULED",
  "ORDER:order.shipment.booked": "SHIPMENT_BOOKED",
  "ORDER:order.shipment.eta_updated": "ETA_UPDATED",
  "ORDER:order.delivered": "SHIPMENT_DELIVERED",
  "SHIPMENT:shipment.booking.confirmed": "SHIPMENT_BOOKED",
  "SHIPMENT:shipment.delivered": "SHIPMENT_DELIVERED",
  "COMMODITYBID:commoditybid.closed": "COMMODITYBID_CLOSED",
  "COMMODITYBID:commoditybid.closed.no_award": "COMMODITYBID_CLOSED",
};

export function emitConversationSystemEvent(
  db: PrismaClient,
  workspaceType: CommWorkspaceType,
  workspaceId: string,
  eventType: SystemEventType | string,
  actorUserId: string | null,
  detail?: string,
  metadata?: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const { SystemEventsService } = await import("./system-events.service.js");
      const events = new SystemEventsService(db);
      const label = EVENT_LABELS[eventType] ?? eventType;
      const body = detail ? `${label}: ${detail}` : label;
      const dedupeKey = (metadata?.dedupeKey as string | undefined) ?? workspaceId;
      await events.record(workspaceType, workspaceId, {
        systemEventKey: `${eventType}:${dedupeKey}`,
        systemEventType: eventType,
        body,
        actorUserId,
        metadata,
      });
    } catch (err) {
      logger.warn({ err, workspaceType, workspaceId, eventType }, "[ConversationHub] system event failed");
    }
  })();
}

export function bootstrapWorkspaceConversationAsync(
  db: PrismaClient,
  workspaceType: CommWorkspaceType | string,
  workspaceId: string,
): void {
  void (async () => {
    try {
      const { bootstrapWorkspaceConversation } = await import("./conversation-bootstrap.js");
      await bootstrapWorkspaceConversation(db, workspaceType, workspaceId);
    } catch (err) {
      logger.warn({ err, workspaceType, workspaceId }, "[ConversationHub] bootstrap failed");
    }
  })();
}

/** Bootstrap conversations for order workspaces spawned from a parent RFQ / CommodityBid. */
export function bootstrapSpawnedOrdersForParent(
  db: PrismaClient,
  parentWorkspaceId: string,
  actorUserId: string | null,
): void {
  void (async () => {
    try {
      const orders = await db.orderWorkspace.findMany({
        where: { parentWorkspaceId },
        select: { workspaceId: true },
      });
      for (const o of orders) {
        bootstrapWorkspaceConversationAsync(db, "ORDER", o.workspaceId);
        emitConversationSystemEvent(db, "ORDER", o.workspaceId, "WORKSPACE_CREATED", actorUserId);
      }
    } catch (err) {
      logger.warn({ err, parentWorkspaceId }, "[ConversationHub] spawned order bootstrap failed");
    }
  })();
}

export function emitFromFsmAuditEvent(
  db: PrismaClient,
  workspaceType: CommWorkspaceType,
  workspaceId: string,
  auditEvent: string,
  actorUserId: string | null,
  detail?: string,
  metadata?: Record<string, unknown>,
): void {
  const eventType = FSM_AUDIT_MAP[`${workspaceType}:${auditEvent}`];
  if (!eventType) return;
  emitConversationSystemEvent(db, workspaceType, workspaceId, eventType, actorUserId, detail, metadata);
}

/** @deprecated Use emitFromFsmAuditEvent — kept for RFQ call sites. */
export function emitFromRfqAuditEvent(
  db: PrismaClient,
  workspaceId: string,
  auditEvent: string,
  actorUserId: string | null,
  detail?: string,
  metadata?: Record<string, unknown>,
): void {
  emitFromFsmAuditEvent(db, "RFQ", workspaceId, auditEvent, actorUserId, detail, metadata);
}
