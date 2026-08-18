import { canAccessOrder } from "../order/order.policy.js";
import { AppError } from "../../utils/httpErrors.js";
export async function assertCanAccessOrderPayment(db, user, orderId) {
    const allowed = await canAccessOrder(db, user, orderId);
    if (!allowed)
        throw new AppError(403, "FORBIDDEN");
}
/** Resolve order workspace for a payment intent via timeline audit trail. */
export async function resolveOrderIdForIntent(db, intentId) {
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
//# sourceMappingURL=payment.policy.js.map