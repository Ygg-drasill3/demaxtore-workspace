import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ORGANIZATION_ACTIVITY_LABELS,
  type OrganizationModuleKey,
  type OrganizationStatus,
} from "@dmx/contracts/mixed-container-organization";
import { logger } from "../../config/logger.js";
import {
  notifyBuyerOrganizationEvent,
  recordOrganizationStatusHistory,
} from "./mc-organization.helpers.js";
import { notifyMcEvent } from "./mixed-container.notifications.js";
import { buyerOrganizationLink } from "@dmx/contracts/mixed-container-organization";

type Tx = Prisma.TransactionClient;

export type BridgeModuleEventInput = {
  organizationWorkspaceId?: string;
  orderId?: string;
  shipmentId?: string;
  sourceModule: OrganizationModuleKey;
  sourceEventType: string;
  sourceEntityId: string;
  dedupeKey?: string;
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
};

const EVENT_STATUS_RULES: Partial<Record<string, OrganizationStatus>> = {
  "po.issued": "SUPPLIER_CONFIRMATION",
  "mixed_container.proforma_uploaded": "PROFORMA_INVOICES_PENDING",
  "mixed_container.allocations_completed": "PROFORMA_INVOICES_COMPLETED",
  "order.production.started": "PRODUCTION",
  "order.inspection.requested": "PRODUCTION",
  "order.inspection.completed": "PRODUCTION",
  "order.shipment.booked": "SHIPMENT_BOOKED",
  "shipment.booking.confirmed": "SHIPMENT_BOOKED",
  "shipment.loaded_on_vessel": "READY_FOR_SHIPMENT",
  "mixed_container.container_loaded": "READY_FOR_SHIPMENT",
  "shipment.departed": "IN_TRANSIT",
  "order.shipment.departed": "IN_TRANSIT",
  "mixed_container.vessel_departed": "IN_TRANSIT",
  "freight.request.created": "READY_FOR_SHIPMENT",
  "freight.offer.selected": "SHIPMENT_BOOKED",
  "shipment.delivered": "DELIVERED",
  "order.delivered": "DELIVERED",
  "mixed_container.delivered": "DELIVERED",
  "smartcontainer.execution_completed": "COMPLETED",
  "mixed_container.organization_completed": "COMPLETED",
};

const SYNC_NOTIFICATIONS: Partial<Record<string, { title: string; message: string; eventType: string }>> = {
  "mixed_container.proforma_uploaded": {
    eventType: "mixed_container.organization_proforma_uploaded",
    title: "Proforma invoice uploaded",
    message: "A proforma invoice has been uploaded.",
  },
  "order.inspection.requested": {
    eventType: "mixed_container.organization_inspection_scheduled",
    title: "Inspection scheduled",
    message: "Inspection has been scheduled.",
  },
  "freight.offer.selected": {
    eventType: "mixed_container.organization_shipment_booked",
    title: "Shipment booked",
    message: "Shipment has been booked.",
  },
  "shipment.booking.confirmed": {
    eventType: "mixed_container.organization_shipment_booked",
    title: "Shipment booked",
    message: "Shipment has been booked.",
  },
  "shipment.loaded_on_vessel": {
    eventType: "mixed_container.organization_container_loaded",
    title: "Container loaded",
    message: "Container has been loaded.",
  },
  "shipment.departed": {
    eventType: "mixed_container.organization_vessel_departed",
    title: "Container departed",
    message: "Container has departed.",
  },
  "order.shipment.departed": {
    eventType: "mixed_container.organization_vessel_departed",
    title: "Container departed",
    message: "Container has departed.",
  },
  "shipment.delivered": {
    eventType: "mixed_container.organization_shipment_arrived",
    title: "Shipment delivered",
    message: "Shipment has been delivered.",
  },
  "order.delivered": {
    eventType: "mixed_container.organization_shipment_arrived",
    title: "Shipment delivered",
    message: "Shipment has been delivered.",
  },
};

const SYNC_EVENT_WHITELIST = new Set([
  "mixed_container.offer_approved",
  "mixed_container.organization_created",
  "mixed_container.proforma_uploaded",
  "mixed_container.allocations_completed",
  "po.issued",
  "order.created_from_mixed_container",
  "order.supplier_confirmed",
  "order.production.started",
  "order.production.completed",
  "order.inspection.requested",
  "order.inspection.completed",
  "order.inspection.skipped",
  "order.shipment.booked",
  "order.shipment.departed",
  "order.delivered",
  "freight.request.created",
  "freight.offer.selected",
  "smartcontainer.order_spawned",
  "smartcontainer.freight_started",
  "smartcontainer.shipment_started",
  "smartcontainer.execution_completed",
  "shipment.created",
  "shipment.booking.confirmed",
  "shipment.loaded_on_vessel",
  "shipment.departed",
  "shipment.delivered",
  "shipment.document.uploaded",
  "order.document.uploaded",
]);

function shouldSyncEvent(eventType: string): boolean {
  return SYNC_EVENT_WHITELIST.has(eventType);
}

const MODULE_FROM_EVENT: Partial<Record<string, OrganizationModuleKey>> = {
  "po.": "PURCHASE_ORDERS",
  "mixed_container.proforma": "PROFORMA_INVOICES",
  "mixed_container.allocation": "PROFORMA_INVOICES",
  "mixed_container.payment": "PROFORMA_INVOICES",
  "freight.": "FREIGHTIQ",
  "smartcontainer.freight": "FREIGHTIQ",
  "order.inspection": "INSPECTION",
  "shipment.": "SHIPMENT_TRACKING",
  "order.shipment": "SHIPMENT_TRACKING",
  "order.delivered": "SHIPMENT_TRACKING",
  "order.document": "DOCUMENTS_HUB",
  "shipment.document": "DOCUMENTS_HUB",
};

function labelForEvent(eventType: string): string {
  return (
    ORGANIZATION_ACTIVITY_LABELS[eventType] ??
    eventType.replace(/\./g, " ").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function moduleFromEventType(eventType: string): OrganizationModuleKey {
  for (const [prefix, mod] of Object.entries(MODULE_FROM_EVENT)) {
    if (mod && eventType.startsWith(prefix)) return mod;
  }
  if (eventType.startsWith("po.")) return "PURCHASE_ORDERS";
  return "DOCUMENTS_HUB";
}

export async function resolveOrganizationWorkspaceId(
  tx: Tx,
  input: { orderId?: string; shipmentId?: string; organizationWorkspaceId?: string },
): Promise<string | null> {
  if (input.organizationWorkspaceId) return input.organizationWorkspaceId;

  if (input.orderId) {
    const link = await tx.mcOrderLink.findFirst({
      where: { supplierOrderId: input.orderId },
      select: { smartContainerId: true },
    });
    if (link) return link.smartContainerId;

    const ow = await tx.orderWorkspace.findUnique({
      where: { workspaceId: input.orderId },
      select: { parentWorkspaceId: true, parentWorkspaceType: true },
    });
    if (ow?.parentWorkspaceType === "MIXED_CONTAINER" && ow.parentWorkspaceId) {
      return ow.parentWorkspaceId;
    }
  }

  if (input.shipmentId) {
    const shipment = await tx.workspace.findUnique({
      where: { id: input.shipmentId },
      select: { spawnedFromId: true },
    });
    if (shipment?.spawnedFromId) {
      return resolveOrganizationWorkspaceId(tx, { orderId: shipment.spawnedFromId });
    }
  }

  return null;
}

async function maybeAdvanceOrganizationStatus(
  tx: Tx,
  workspaceId: string,
  sourceEventType: string,
  actorUserId: string | null,
) {
  const targetStatus = EVENT_STATUS_RULES[sourceEventType];
  if (!targetStatus) return;

  const details = await tx.mixedContainerDetails.findUnique({ where: { workspaceId } });
  if (!details?.organizationRef || !details.organizationStatus) return;

  const current = details.organizationStatus as OrganizationStatus;
  const statusOrder = [
    "ORGANIZATION_STARTED",
    "SUPPLIER_CONFIRMATION",
    "PROFORMA_INVOICES_PENDING",
    "PROFORMA_INVOICES_COMPLETED",
    "PRODUCTION",
    "READY_FOR_SHIPMENT",
    "SHIPMENT_BOOKED",
    "IN_TRANSIT",
    "DELIVERED",
    "COMPLETED",
  ];
  if (statusOrder.indexOf(targetStatus) <= statusOrder.indexOf(current)) return;

  await tx.mixedContainerDetails.update({
    where: { workspaceId },
    data: { organizationStatus: targetStatus },
  });

  await recordOrganizationStatusHistory(tx, {
    workspaceId,
    fromStatus: current,
    toStatus: targetStatus,
    actorUserId,
    note: `Auto-advanced from ${sourceEventType}`,
  });

  const ws = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { createdById: true } });
  if (ws && details.organizationRef) {
    await notifyBuyerOrganizationEvent(tx, {
      workspaceId,
      buyerUserId: ws.createdById,
      organizationRef: details.organizationRef,
      status: targetStatus,
    });
  }
}

async function notifySyncEvent(
  tx: Tx,
  workspaceId: string,
  sourceEventType: string,
  buyerUserId: string,
) {
  const payload = SYNC_NOTIFICATIONS[sourceEventType];
  if (!payload) return;

  await notifyMcEvent(tx, {
    userIds: [buyerUserId],
    workspaceId,
    eventType: payload.eventType,
    title: payload.title,
    message: payload.message,
    link: buyerOrganizationLink(workspaceId),
  });
}

/** Idempotent bridge from module events into the Organization Workspace. */
export async function bridgeModuleEventToOrganization(
  tx: Tx,
  input: BridgeModuleEventInput,
): Promise<boolean> {
  if (!shouldSyncEvent(input.sourceEventType)) return false;

  const workspaceId = await resolveOrganizationWorkspaceId(tx, input);
  if (!workspaceId) {
    logger.warn(
      { sourceEventType: input.sourceEventType, sourceEntityId: input.sourceEntityId, orderId: input.orderId, shipmentId: input.shipmentId },
      "[MC Org Sync] skipped — organization workspace not resolved",
    );
    return false;
  }

  const details = await tx.mixedContainerDetails.findUnique({
    where: { workspaceId },
    select: { organizationRef: true, organizationStatus: true },
  });
  if (!details?.organizationRef) {
    logger.warn(
      { workspaceId, sourceEventType: input.sourceEventType, sourceEntityId: input.sourceEntityId },
      "[MC Org Sync] skipped — organization not created",
    );
    return false;
  }

  const dedupeKey =
    input.dedupeKey ??
    `${input.sourceEventType}:${input.sourceEntityId}${input.idempotencyKey ? `:${input.idempotencyKey}` : ""}`;

  const existing = await tx.mcOrganizationEvent.findUnique({
    where: { workspaceId_dedupeKey: { workspaceId, dedupeKey } },
    select: { id: true },
  });
  if (existing) return false;

  const canonicalEventType = input.sourceEventType;
  const label = labelForEvent(canonicalEventType);
  const sourceModule = input.sourceModule ?? moduleFromEventType(canonicalEventType);

  await tx.mcOrganizationEvent.create({
    data: {
      workspaceId,
      dedupeKey,
      sourceModule,
      sourceEventType: input.sourceEventType,
      canonicalEventType,
      label,
      actorUserId: input.actorUserId ?? null,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
    },
  });

  await tx.timelineEvent.create({
    data: {
      workspaceId,
      eventType: canonicalEventType,
      actorUserId: input.actorUserId ?? null,
      payload: {
        ...(input.payload ?? {}),
        organizationSync: true,
        sourceModule,
        dedupeKey,
      } as Prisma.InputJsonValue,
    },
  });

  await maybeAdvanceOrganizationStatus(tx, workspaceId, canonicalEventType, input.actorUserId ?? null);

  const ws = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { createdById: true } });
  if (ws) {
    await notifySyncEvent(tx, workspaceId, canonicalEventType, ws.createdById);
  }

  return true;
}

export async function bridgeOrderTimelineToOrganization(
  tx: Tx,
  orderId: string,
  auditEvent: string,
  actorUserId: string | null,
  payload: Record<string, unknown>,
) {
  return bridgeModuleEventToOrganization(tx, {
    orderId,
    sourceModule: moduleFromEventType(auditEvent),
    sourceEventType: auditEvent,
    sourceEntityId: orderId,
    actorUserId,
    payload,
    idempotencyKey: typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : undefined,
  });
}

export async function bridgeShipmentTimelineToOrganization(
  tx: Tx,
  shipmentId: string,
  auditEvent: string,
  actorUserId: string | null,
  payload: Record<string, unknown>,
) {
  return bridgeModuleEventToOrganization(tx, {
    shipmentId,
    sourceModule: moduleFromEventType(auditEvent),
    sourceEventType: auditEvent,
    sourceEntityId: shipmentId,
    actorUserId,
    payload,
    idempotencyKey: typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : undefined,
  });
}

export async function bindOrganizationToPurchaseOrder(
  tx: Tx,
  poId: string,
  organizationWorkspaceId: string,
) {
  await tx.purchaseOrder.update({
    where: { id: poId },
    data: { organizationWorkspaceId },
  });
}

export async function bindOrganizationToFreightRequest(
  tx: Tx,
  freightRequestId: string,
  organizationWorkspaceId: string,
) {
  await tx.freightRequest.update({
    where: { id: freightRequestId },
    data: { organizationWorkspaceId },
  });
}

export async function getLatestModuleActivity(
  prisma: PrismaClient,
  workspaceId: string,
): Promise<Map<OrganizationModuleKey, { label: string; createdAt: Date }>> {
  const rows = await prisma.$queryRaw<Array<{ source_module: string; label: string; created_at: Date }>>`
    SELECT DISTINCT ON (source_module) source_module, label, created_at
    FROM mc_organization_events
    WHERE workspace_id = ${workspaceId}::uuid
    ORDER BY source_module, created_at DESC
  `;
  const map = new Map<OrganizationModuleKey, { label: string; createdAt: Date }>();
  for (const row of rows) {
    map.set(row.source_module as OrganizationModuleKey, { label: row.label, createdAt: row.created_at });
  }
  return map;
}
