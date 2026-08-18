import { canAccessTrade } from "../trade/trade.policy.js";
export async function canAccessFreightBooking(db, user, tradeId) {
    if (user.role === "ADMIN")
        return true;
    return canAccessTrade(db, user, tradeId);
}
export function canManageFreightBooking(user) {
    return user.role === "ADMIN";
}
export function canSubmitForecast(user) {
    return user.role === "SUPPLIER" || user.role === "ADMIN";
}
export function canSelectCarrier(user) {
    return user.role === "ADMIN" || user.role === "BUYER";
}
export function canConfirmBooking(user) {
    return user.role === "ADMIN";
}
//# sourceMappingURL=freight-booking.policy.js.map