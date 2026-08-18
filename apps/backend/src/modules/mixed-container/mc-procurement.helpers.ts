import type { Prisma, PrismaClient } from "@prisma/client";
import {
  mcStateToProcurementStatus,
  PROCUREMENT_STATUS_LABELS,
  type ProcurementRequestStatus,
} from "@dmx/contracts/mixed-container-procurement";
import { notifyMcEvent } from "./mixed-container.notifications.js";
import { buyerOrganizationLink, adminOrganizationLink } from "@dmx/contracts/mixed-container-organization";

export async function nextPrRef(prisma: Prisma.TransactionClient | PrismaClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `PR-${year}-`;
  const last = await prisma.mixedContainerDetails.findFirst({
    where: { procurementRequestRef: { startsWith: prefix } },
    orderBy: { procurementRequestRef: "desc" },
    select: { procurementRequestRef: true },
  });
  const n = last?.procurementRequestRef ? Number(last.procurementRequestRef.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(6, "0")}`;
}

export async function nextCpRef(prisma: Prisma.TransactionClient | PrismaClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `CP-${year}-`;
  const last = await prisma.mixedContainerDetails.findFirst({
    where: { commercialProposalRef: { startsWith: prefix } },
    orderBy: { commercialProposalRef: "desc" },
    select: { commercialProposalRef: true },
  });
  const n = last?.commercialProposalRef ? Number(last.commercialProposalRef.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(6, "0")}`;
}

export async function recordProcurementStatusHistory(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    fromState: string;
    toState: string;
    actorUserId?: string | null;
    note?: string | null;
  },
) {
  const fromStatus = mcStateToProcurementStatus(input.fromState);
  const toStatus = mcStateToProcurementStatus(input.toState);
  if (fromStatus === toStatus && input.fromState === input.toState) return;

  await tx.mcProcurementStatusHistory.create({
    data: {
      workspaceId: input.workspaceId,
      fromStatus: fromStatus !== toStatus ? fromStatus : null,
      toStatus,
      workspaceState: input.toState,
      actorUserId: input.actorUserId ?? null,
      note: input.note ?? null,
    },
  });
}

export function buyerProcurementLink(workspaceId: string): string {
  return `/buyer/mixed-container/requests/${workspaceId}`;
}

export function buyerOrganizationWorkspaceLink(workspaceId: string): string {
  return buyerOrganizationLink(workspaceId);
}

export function adminProcurementLink(workspaceId: string): string {
  return `/admin/mixed-container/${workspaceId}`;
}

export function adminOrganizationWorkspaceLink(workspaceId: string): string {
  return adminOrganizationLink(workspaceId);
}

export async function notifyBuyerProcurementStatus(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    buyerUserId: string;
    procurementRequestRef: string;
    status: ProcurementRequestStatus;
  },
) {
  const label = PROCUREMENT_STATUS_LABELS[input.status];
  const messages: Partial<Record<ProcurementRequestStatus, { title: string; message: string; eventType: string }>> = {
    SUBMITTED: {
      eventType: "mixed_container.procurement_submitted",
      title: "Procurement request received",
      message: `Your Procurement Request ${input.procurementRequestRef} has been received.`,
    },
    UNDER_PROCUREMENT: {
      eventType: "mixed_container.procurement_in_progress",
      title: "Under procurement",
      message: `Your Procurement Request ${input.procurementRequestRef} is now under procurement.`,
    },
    COMMERCIAL_PROPOSAL_READY: {
      eventType: "mixed_container.proposal_ready",
      title: "Commercial proposal ready",
      message: `Your Commercial Proposal is ready.`,
    },
    BUYER_REVIEW: {
      eventType: "mixed_container.proposal_published",
      title: "Commercial proposal published",
      message: `Your Commercial Proposal is ready.`,
    },
    REVISION_REQUESTED: {
      eventType: "mixed_container.revision_requested",
      title: "Revision requested",
      message: `Your revision request for ${input.procurementRequestRef} has been recorded.`,
    },
    APPROVED: {
      eventType: "mixed_container.proposal_approved",
      title: "Proposal approved",
      message: `Your Commercial Proposal has been approved.`,
    },
    ORGANIZATION_STARTED: {
      eventType: "mixed_container.organization_started",
      title: "Organization started",
      message: "Organization has started.",
    },
    COMPLETED: {
      eventType: "mixed_container.completed",
      title: "Procurement completed",
      message: `Procurement for ${input.procurementRequestRef} is complete.`,
    },
  };

  const payload = messages[input.status];
  if (!payload) return;

  const link =
    input.status === "ORGANIZATION_STARTED"
      ? buyerOrganizationWorkspaceLink(input.workspaceId)
      : buyerProcurementLink(input.workspaceId);

  await notifyMcEvent(tx, {
    userIds: [input.buyerUserId],
    workspaceId: input.workspaceId,
    eventType: payload.eventType,
    title: payload.title,
    message: payload.message,
    link,
  });
}

export async function notifyBuyerProposalRevised(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    buyerUserId: string;
    procurementRequestRef: string;
  },
) {
  await notifyMcEvent(tx, {
    userIds: [input.buyerUserId],
    workspaceId: input.workspaceId,
    eventType: "mixed_container.proposal_revised",
    title: "Revised commercial proposal",
    message: "A revised Commercial Proposal is available.",
    link: buyerProcurementLink(input.workspaceId),
  });
}

export async function notifyAdminsRevisionRequested(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    procurementRequestRef: string;
    comment: string;
  },
) {
  const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admins.length) return;

  await notifyMcEvent(tx, {
    userIds: admins.map((a) => a.id),
    workspaceId: input.workspaceId,
    eventType: "mixed_container.revision_requested_admin",
    title: "Buyer requested revision",
    message: `Revision requested on ${input.procurementRequestRef}: ${input.comment.slice(0, 120)}`,
    link: adminProcurementLink(input.workspaceId),
    priority: "HIGH",
  });
}

export async function notifyAdminsNewProcurementRequest(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    procurementRequestRef: string;
    buyerName: string;
  },
) {
  const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admins.length) return;

  await notifyMcEvent(tx, {
    userIds: admins.map((a) => a.id),
    workspaceId: input.workspaceId,
    eventType: "mixed_container.procurement_submitted_admin",
    title: "New procurement request",
    message: `${input.buyerName} submitted ${input.procurementRequestRef}.`,
    link: adminProcurementLink(input.workspaceId),
    priority: "HIGH",
  });
}

export async function notifyBuyerManagerAssigned(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    buyerUserId: string;
    procurementRequestRef: string;
    managerName: string;
  },
) {
  await notifyMcEvent(tx, {
    userIds: [input.buyerUserId],
    workspaceId: input.workspaceId,
    eventType: "mixed_container.manager_assigned",
    title: "Procurement manager assigned",
    message: `${input.managerName} is assigned to ${input.procurementRequestRef}.`,
    link: buyerProcurementLink(input.workspaceId),
  });
}
