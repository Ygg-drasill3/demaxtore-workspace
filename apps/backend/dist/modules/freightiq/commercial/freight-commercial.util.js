export function computeDisplayPrice(internalCostUsd, freightiqMarginUsd) {
    return Math.round((internalCostUsd + freightiqMarginUsd) * 100) / 100;
}
export function resolveIntakeCommercial(input) {
    const internalCostUsd = input.internalCostUsd ?? input.oceanFreight ?? 0;
    const freightiqMarginUsd = input.freightiqMarginUsd ?? 0;
    if (internalCostUsd <= 0)
        throw new Error("INVALID_INTERNAL_COST");
    const displayPriceUsd = computeDisplayPrice(internalCostUsd, freightiqMarginUsd);
    return { internalCostUsd, freightiqMarginUsd, displayPriceUsd };
}
export function commercialFromOffer(o) {
    const internal = Number(o.internalCostUsd ?? o.price);
    const margin = Number(o.freightiqMarginUsd);
    const display = Number(o.displayPriceUsd ?? o.price);
    return {
        internalCostUsd: internal,
        freightiqMarginUsd: margin,
        displayPriceUsd: display,
        marginLockedAt: o.marginLockedAt?.toISOString() ?? null,
        marginLockedBy: o.marginLockedBy,
    };
}
export function displayPriceForOffer(o) {
    return Number(o.displayPriceUsd ?? o.price);
}
//# sourceMappingURL=freight-commercial.util.js.map