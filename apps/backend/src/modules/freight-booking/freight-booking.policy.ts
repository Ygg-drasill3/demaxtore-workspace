import type { PrismaClient } from "@prisma/client";
import type { AuthUser } from "../order/order.policy.js";
import { canAccessTrade } from "../trade/trade.policy.js";

export type { AuthUser };

export async function canAccessFreightBooking(
  db: PrismaClient | import("@prisma/client").Prisma.TransactionClient,
  user: AuthUser,
  tradeId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  return canAccessTrade(db as PrismaClient, user, tradeId);
}

export function canManageFreightBooking(user: AuthUser): boolean {
  return user.role === "ADMIN";
}

export function canSubmitForecast(user: AuthUser): boolean {
  return user.role === "SUPPLIER" || user.role === "ADMIN";
}

export function canSelectCarrier(user: AuthUser): boolean {
  return user.role === "ADMIN" || user.role === "BUYER";
}

export function canConfirmBooking(user: AuthUser): boolean {
  return user.role === "ADMIN";
}
