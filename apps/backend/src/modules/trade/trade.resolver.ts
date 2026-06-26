import type { PrismaClient, Workspace, WorkspaceType } from "@prisma/client";

const ROOT_TYPES = new Set<WorkspaceType>([
  "RFQ",
  "COMMODITYBID",
  "MIXED_CONTAINER",
  "BULK_CONTAINER",
]);

export interface TradeGraph {
  root: Workspace;
  rootId: string;
  orderIds: string[];
  shipmentIds: string[];
  allWorkspaceIds: string[];
}

export async function resolveTradeRoot(
  db: PrismaClient,
  workspaceId: string,
): Promise<Workspace | null> {
  let current = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!current) return null;

  if (ROOT_TYPES.has(current.type)) return current;

  if (current.type === "ORDER") {
    const ow = await db.orderWorkspace.findUnique({
      where: { workspaceId: current.id },
      select: { parentWorkspaceId: true },
    });
    if (ow?.parentWorkspaceId) {
      return resolveTradeRoot(db, ow.parentWorkspaceId);
    }
  }

  if (current.type === "SHIPMENT") {
    const sw = await db.shipmentWorkspace.findUnique({
      where: { workspaceId: current.id },
      select: { orderWorkspaceId: true },
    });
    if (sw?.orderWorkspaceId) {
      return resolveTradeRoot(db, sw.orderWorkspaceId);
    }
    if (current.spawnedFromId) {
      return resolveTradeRoot(db, current.spawnedFromId);
    }
  }

  let cursor: Workspace = current;
  while (cursor.spawnedFromId) {
    const parent = await db.workspace.findUnique({ where: { id: cursor.spawnedFromId } });
    if (!parent) break;
    if (ROOT_TYPES.has(parent.type)) return parent;
    cursor = parent;
  }

  if (cursor.type === "ORDER") {
    const ow = await db.orderWorkspace.findUnique({
      where: { workspaceId: cursor.id },
      select: { parentWorkspaceId: true },
    });
    if (ow?.parentWorkspaceId) return resolveTradeRoot(db, ow.parentWorkspaceId);
  }

  return ROOT_TYPES.has(cursor.type) ? cursor : null;
}

export async function collectTradeGraph(
  db: PrismaClient,
  root: Workspace,
): Promise<TradeGraph> {
  const orderIdSet = new Set<string>();

  const spawnedOrders = await db.workspace.findMany({
    where: { spawnedFromId: root.id, type: "ORDER" },
    select: { id: true },
  });
  for (const o of spawnedOrders) orderIdSet.add(o.id);

  if (root.type === "MIXED_CONTAINER") {
    const links = await db.mcOrderLink.findMany({
      where: { smartContainerId: root.id },
      select: { supplierOrderId: true },
    });
    for (const l of links) orderIdSet.add(l.supplierOrderId);
  }

  if (root.type === "BULK_CONTAINER") {
    const links = await db.bcOrderLink.findMany({
      where: { workspaceId: root.id },
      select: { supplierOrderId: true },
    });
    for (const l of links) orderIdSet.add(l.supplierOrderId);
  }

  if (root.type === "RFQ") {
    const details = await db.rfqDetails.findUnique({
      where: { workspaceId: root.id },
      select: { linkedCommoditybidId: true },
    });
    if (details?.linkedCommoditybidId) {
      const cbOrders = await db.workspace.findMany({
        where: { spawnedFromId: details.linkedCommoditybidId, type: "ORDER" },
        select: { id: true },
      });
      for (const o of cbOrders) orderIdSet.add(o.id);
    }
  }

  const orderIds = [...orderIdSet];

  const shipments = orderIds.length
    ? await db.workspace.findMany({
        where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
        select: { id: true },
      })
    : [];

  const shipmentIds = shipments.map((s) => s.id);
  const allWorkspaceIds = [root.id, ...orderIds, ...shipmentIds];

  if (root.type === "RFQ") {
    const details = await db.rfqDetails.findUnique({
      where: { workspaceId: root.id },
      select: { linkedCommoditybidId: true },
    });
    if (details?.linkedCommoditybidId) {
      allWorkspaceIds.push(details.linkedCommoditybidId);
    }
  }

  return {
    root,
    rootId: root.id,
    orderIds,
    shipmentIds,
    allWorkspaceIds: [...new Set(allWorkspaceIds)],
  };
}

export function tradeRefFromRoot(root: Workspace): string {
  const ref = root.externalRef;
  if (ref.startsWith("RFQ-")) return ref.replace(/^RFQ-/, "TRADE-");
  if (ref.startsWith("TRADE-")) return ref;
  return `TRADE-${ref}`;
}
