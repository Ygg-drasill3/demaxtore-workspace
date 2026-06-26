import type { PrismaClient } from "@prisma/client";
import type { AuthUser } from "../../types/auth-user.js";
import { canAccessOrder } from "../order/order.policy.js";
import { AppError } from "../../utils/httpErrors.js";

export async function assertCanAccessOrderPayment(
  db: PrismaClient,
  user: AuthUser,
  orderId: string,
): Promise<void> {
  const allowed = await canAccessOrder(db, user, orderId);
  if (!allowed) throw new AppError(403, "FORBIDDEN");
}

/** Resolve order workspace for a payment intent via timeline audit trail. */
export async function resolveOrderIdForIntent(
  db: PrismaClient,
  intentId: string,
): Promise<string | null> {
  const row = await db.timelineEvent.findFirst({
    where: {
      eventType: "payment.pending",
      payload: { path: ["intentId"], equals: intentId },
    },
    select: { workspaceId: true },
    orderBy: { createdAt: "desc" },
  });
  return row?.workspaceId ?? null;
}
