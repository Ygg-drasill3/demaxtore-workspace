import type { PrismaClient } from "@prisma/client";
import type { AuthUser } from "../order/order.policy.js";
import { canAccessTrade } from "../trade/trade.policy.js";

export type { AuthUser };

export async function canAccessTradeTimeline(
  db: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<boolean> {
  return canAccessTrade(db, user, workspaceId);
}

export function filterTimelineForSupplier<T extends { visibility?: string }>(
  events: T[],
  role: string,
): T[] {
  if (role === "ADMIN" || role === "BUYER") return events;
  return events.filter((e) => e.visibility !== "BUYER" && e.visibility !== "ADMIN");
}
