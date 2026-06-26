/** Production progress must reach 100% before order advances past production. */
export const PRODUCTION_COMPLETE_PERCENT = 100;
export function isProductionCompletePercent(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= PRODUCTION_COMPLETE_PERCENT;
}
//# sourceMappingURL=order.production.js.map