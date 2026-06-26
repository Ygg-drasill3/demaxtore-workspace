// Workspace-type aware access policy (socket subscribe + shared ACL entry).
import type { PrismaClient, WorkspaceType } from "@prisma/client";
import { canAccessRfq, type AuthUser } from "../rfq/rfq.policy.js";
import { canAccessCommodityBid } from "../commoditybid/commoditybid.policy.js";
import { canAccessOrder } from "../order/order.policy.js";
import { canAccessShipment } from "../shipment/shipment.policy.js";
import { canAccessMixedContainer } from "../mixed-container/mixed-container.policy.js";
import { canAccessBulkContainer } from "../bulk-container/bulk-container.policy.js";

export type { AuthUser };

export async function canAccessWorkspace(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<boolean> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { type: true },
  });
  if (!ws) return false;

  switch (ws.type as WorkspaceType) {
    case "RFQ":
      return canAccessRfq(prisma, user, workspaceId);
    case "COMMODITYBID":
      return canAccessCommodityBid(prisma, user, workspaceId);
    case "ORDER":
      return canAccessOrder(prisma, user, workspaceId);
    case "SHIPMENT":
      return canAccessShipment(prisma, user, workspaceId);
    case "MIXED_CONTAINER":
      return canAccessMixedContainer(prisma, user, workspaceId);
    case "BULK_CONTAINER":
      return canAccessBulkContainer(prisma, user, workspaceId);
    default:
      return false;
  }
}
