import type { PrismaClient } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import { canAccessRfq, type AuthUser } from "../rfq/rfq.policy.js";
import { canAccessCommodityBid } from "../commoditybid/commoditybid.policy.js";
import { canAccessOrder } from "../order/order.policy.js";
import { canAccessShipment } from "../shipment/shipment.policy.js";
import { canAccessPo } from "../purchase-order/purchase-order.policy.js";
import type { VisibilityContext } from "./communication.visibility.js";

export type { AuthUser };

export interface ResolvedWorkspace {
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  /** Workspace id used for audit log + timeline (may differ for PO). */
  auditWorkspaceId: string;
}

export async function resolveWorkspace(
  prisma: PrismaClient,
  workspaceType: CommWorkspaceType,
  workspaceId: string,
): Promise<ResolvedWorkspace | null> {
  switch (workspaceType) {
    case "RFQ":
    case "COMMODITYBID":
    case "ORDER":
    case "SHIPMENT": {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, type: true },
      });
      if (!ws || ws.type !== workspaceType) return null;
      return { workspaceType, workspaceId, auditWorkspaceId: workspaceId };
    }
    case "PO": {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: workspaceId },
        select: { id: true, orderId: true },
      });
      if (!po) return null;
      return { workspaceType, workspaceId: po.id, auditWorkspaceId: po.orderId };
    }
    case "FREIGHTIQ": {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, type: true },
      });
      if (!ws || ws.type !== "ORDER") return null;
      return { workspaceType, workspaceId, auditWorkspaceId: workspaceId };
    }
    default:
      return null;
  }
}

export async function canAccessCommWorkspace(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceType: CommWorkspaceType,
  workspaceId: string,
): Promise<boolean> {
  const resolved = await resolveWorkspace(prisma, workspaceType, workspaceId);
  if (!resolved) return false;

  switch (workspaceType) {
    case "RFQ":
      return canAccessRfq(prisma, user, workspaceId);
    case "COMMODITYBID":
      return canAccessCommodityBid(prisma, user, workspaceId);
    case "ORDER":
    case "FREIGHTIQ":
      return canAccessOrder(prisma, user, workspaceId);
    case "SHIPMENT":
      return canAccessShipment(prisma, user, workspaceId);
    case "PO":
      return canAccessPo(prisma, user, workspaceId);
    default:
      return false;
  }
}

export async function buildVisibilityContext(
  prisma: PrismaClient,
  resolved: ResolvedWorkspace,
): Promise<VisibilityContext> {
  const auditId = resolved.auditWorkspaceId;

  if (resolved.workspaceType === "PO") {
    const po = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: resolved.workspaceId },
      select: { buyerId: true, supplierId: true, orderId: true },
    });
    const parts = await prisma.workspaceParticipant.findMany({
      where: { workspaceId: po.orderId, leftAt: null },
      select: { userId: true, participantRole: true },
    });
    return {
      buyerUserIds: [po.buyerId],
      supplierUserIds: [po.supplierId],
      participantUserIds: parts.map((p) => p.userId),
    };
  }

  const ws = await prisma.workspace.findUniqueOrThrow({
    where: { id: auditId },
    select: { createdById: true, type: true },
  });

  const participants = await prisma.workspaceParticipant.findMany({
    where: { workspaceId: auditId, leftAt: null },
    include: { user: { select: { role: true } } },
  });

  const buyerUserIds = new Set<string>();
  const supplierUserIds = new Set<string>();
  const participantUserIds = participants.map((p) => p.userId);

  if (ws.createdById) buyerUserIds.add(ws.createdById);

  for (const p of participants) {
    if (p.participantRole === "OWNER") {
      if (p.user.role === "BUYER") buyerUserIds.add(p.userId);
      if (p.user.role === "SUPPLIER") supplierUserIds.add(p.userId);
    }
    if (p.participantRole === "COUNTERPARTY") {
      if (p.user.role === "SUPPLIER") supplierUserIds.add(p.userId);
      if (p.user.role === "BUYER") buyerUserIds.add(p.userId);
    }
  }

  return {
    buyerUserIds: [...buyerUserIds],
    supplierUserIds: [...supplierUserIds],
    participantUserIds,
  };
}
