import type { PrismaClient } from "@prisma/client";
import type { AuthUser } from "../order/order.policy.js";
import { canAccessTrade } from "../trade/trade.policy.js";

export type { AuthUser };

export async function canAccessFreightEstimate(
  db: PrismaClient | import("@prisma/client").Prisma.TransactionClient,
  user: AuthUser,
  tradeId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  return canAccessTrade(db as PrismaClient, user, tradeId);
}

export async function assertFreightEstimatePoGate(
  db: PrismaClient,
  tradeId: string,
): Promise<void> {
  const { FreightEstimateService } = await import("./freight-estimate.service.js");
  const svc = new FreightEstimateService(db);
  await svc.assertActiveEstimateForPo(tradeId);
}
