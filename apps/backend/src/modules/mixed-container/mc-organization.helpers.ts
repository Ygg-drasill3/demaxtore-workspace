import type { Prisma, PrismaClient } from "@prisma/client";
import type { OrganizationStatus } from "@dmx/contracts/mixed-container-organization";
import { notifyMcEvent } from "./mixed-container.notifications.js";
import { adminOrganizationLink, buyerOrganizationLink } from "@dmx/contracts/mixed-container-organization";

export async function nextOrRef(prisma: Prisma.TransactionClient | PrismaClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `OR-${year}-`;
  const last = await prisma.mixedContainerDetails.findFirst({
    where: { organizationRef: { startsWith: prefix } },
    orderBy: { organizationRef: "desc" },
    select: { organizationRef: true },
  });
  const n = last?.organizationRef ? Number(last.organizationRef.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(6, "0")}`;
}

export async function recordOrganizationStatusHistory(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    fromStatus: OrganizationStatus | null;
    toStatus: OrganizationStatus;
    actorUserId?: string | null;
    note?: string | null;
  },
) {
  if (input.fromStatus === input.toStatus) return;
  await tx.mcOrganizationStatusHistory.create({
    data: {
      workspaceId: input.workspaceId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId ?? null,
      note: input.note ?? null,
    },
  });
}

const ORG_NOTIFICATIONS: Partial<
  Record<OrganizationStatus, { title: string; message: string; eventType: string }>
> = {
  ORGANIZATION_STARTED: {
    eventType: "mixed_container.organization_started",
    title: "Organization started",
    message: "Organization has started.",
  },
  PRODUCTION: {
    eventType: "mixed_container.organization_production_started",
    title: "Production started",
    message: "Production has started.",
  },
  SHIPMENT_BOOKED: {
    eventType: "mixed_container.organization_shipment_booked",
    title: "Shipment booked",
    message: "Shipment has been booked.",
  },
  IN_TRANSIT: {
    eventType: "mixed_container.organization_vessel_departed",
    title: "Container departed",
    message: "Container has departed.",
  },
  DELIVERED: {
    eventType: "mixed_container.organization_shipment_arrived",
    title: "Shipment arrived",
    message: "Shipment has arrived.",
  },
};

export async function notifyBuyerOrganizationEvent(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    buyerUserId: string;
    organizationRef: string;
    status: OrganizationStatus;
  },
) {
  const payload = ORG_NOTIFICATIONS[input.status];
  if (!payload) return;

  await notifyMcEvent(tx, {
    userIds: [input.buyerUserId],
    workspaceId: input.workspaceId,
    eventType: payload.eventType,
    title: payload.title,
    message: payload.message,
    link: buyerOrganizationLink(input.workspaceId),
  });
}

export async function notifyOrganizationCreated(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    buyerUserId: string;
    organizationRef: string;
  },
) {
  await notifyMcEvent(tx, {
    userIds: [input.buyerUserId],
    workspaceId: input.workspaceId,
    eventType: "mixed_container.organization_created",
    title: "Organization workspace created",
    message: `Organization ${input.organizationRef} has been created.`,
    link: buyerOrganizationLink(input.workspaceId),
  });
}

export { buyerOrganizationLink, adminOrganizationLink };
