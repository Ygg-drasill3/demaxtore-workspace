import { FREIGHTIQ_ORDER_ELIGIBLE_STATES } from "@dmx/contracts/freightiq";
import { canAccessOrder } from "../order/order.policy.js";
export async function canAccessFreightForOrder(prisma, user, orderId) {
    return canAccessOrder(prisma, user, orderId);
}
export function assertFreightActionRole(action, role) {
    const rules = {
        create_request: ["BUYER", "ADMIN"],
        submit_offer: ["ADMIN", "SUPPLIER"],
        revise_offer: ["ADMIN", "SUPPLIER"],
        withdraw_offer: ["ADMIN", "SUPPLIER"],
        select_offer: ["BUYER", "ADMIN"],
        cancel_request: ["BUYER", "ADMIN"],
        proceed_to_booking: ["BUYER", "ADMIN"],
    };
    if (!rules[action].includes(role)) {
        throw new Error("FORBIDDEN_ROLE");
    }
}
export function isOrderEligibleForFreight(state, actorRole) {
    if (state === "CLOSED" || state === "CANCELLED" || state === "DISPUTED" || state === "REJECTED")
        return false;
    if (actorRole === "ADMIN")
        return true;
    return FREIGHTIQ_ORDER_ELIGIBLE_STATES.includes(state);
}
//# sourceMappingURL=freightiq.policy.js.map