import { canAccessTrade } from "../trade/trade.policy.js";
export async function canAccessTradeTimeline(db, user, workspaceId) {
    return canAccessTrade(db, user, workspaceId);
}
export function filterTimelineForSupplier(events, role) {
    if (role === "ADMIN" || role === "BUYER")
        return events;
    return events.filter((e) => e.visibility !== "BUYER" && e.visibility !== "ADMIN");
}
//# sourceMappingURL=trade-timeline.policy.js.map