import { canAccessTrade } from "../trade/trade.policy.js";
export async function canAccessFreightEstimate(db, user, tradeId) {
    if (user.role === "ADMIN")
        return true;
    return canAccessTrade(db, user, tradeId);
}
export async function assertFreightEstimatePoGate(db, tradeId) {
    const { FreightEstimateService } = await import("./freight-estimate.service.js");
    const svc = new FreightEstimateService(db);
    await svc.assertActiveEstimateForPo(tradeId);
}
//# sourceMappingURL=freight-estimate.policy.js.map