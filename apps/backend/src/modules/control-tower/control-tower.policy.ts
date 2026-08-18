import type { PrismaClient, Workspace } from "@prisma/client";
import type { AuthUser } from "../order/order.policy.js";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import { collectTradeGraph, findDirectOrderRoots, resolveTradeRoot } from "../trade/trade.resolver.js";

const ROOT_TYPES = ["RFQ", "COMMODITYBID", "MIXED_CONTAINER", "BULK_CONTAINER"] as const;

export async function findAccessibleTradeRoots(
  db: PrismaClient,
  actor: AuthUser,
): Promise<Workspace[]> {
  if (hasPortfolioVisibility(actor.role)) {
    const [rooted, directOrders] = await Promise.all([
      db.workspace.findMany({
        where: { type: { in: [...ROOT_TYPES] } },
        take: 200,
        orderBy: { updatedAt: "desc" },
      }),
      findDirectOrderRoots(db),
    ]);
    // Callers cap this list, so interleave by recency — otherwise every direct order
    // sorts behind the root-type page and falls outside the cap.
    return [...rooted, ...directOrders].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  const participations = await db.workspaceParticipant.findMany({
    where: { userId: actor.id, leftAt: null },
    select: { workspaceId: true },
    take: 500,
  });

  const roots = new Map<string, Workspace>();
  for (const p of participations) {
    const root = await resolveTradeRoot(db, p.workspaceId);
    if (!root) continue;
    if (actor.role === "SUPPLIER" && root.createdById === actor.id) {
      // supplier on their own created roots — ok
    }
    roots.set(root.id, root);
  }
  return [...roots.values()];
}

export async function getAccessibleTradeIds(
  db: PrismaClient,
  actor: AuthUser,
): Promise<string[]> {
  const roots = await findAccessibleTradeRoots(db, actor);
  const ids = new Set<string>();
  for (const root of roots) {
    ids.add(root.id);
    const graph = await collectTradeGraph(db, root);
    for (const id of graph.allWorkspaceIds) ids.add(id);
  }
  return [...ids];
}

export function canAccessImportControlTower(actor: AuthUser): boolean {
  return hasPortfolioVisibility(actor.role) || actor.role === "BUYER" || actor.role === "SUPPLIER";
}
