import { isUnknownActivityDays } from "@dmx/contracts/activity-days";
export const FUNNEL_STAGE_KEYS = [
    "rfq_created",
    "rfq_submitted",
    "supplier_assigned",
    "quotation_submitted",
    "supplier_selected",
    "po_issued",
    "order_created",
    "shipment_created",
    "shipment_completed",
];
export const FUNNEL_LABELS = {
    rfq_created: "RFQ Created",
    rfq_submitted: "RFQ Submitted",
    supplier_assigned: "Supplier Assigned",
    quotation_submitted: "Quotation Submitted",
    supplier_selected: "Supplier Selected",
    po_issued: "PO Issued",
    order_created: "Order Created",
    shipment_created: "Shipment Created",
    shipment_completed: "Shipment Completed",
};
export function buildFunnelStages(counts, avgHours) {
    const stages = [];
    for (let i = 0; i < FUNNEL_STAGE_KEYS.length; i++) {
        const count = counts[i] ?? 0;
        const prev = i > 0 ? counts[i - 1] ?? 0 : count;
        const conversionPercent = prev > 0 ? Math.round((count / prev) * 1000) / 10 : count > 0 ? 100 : 0;
        const dropoffPercent = i === 0 ? 0 : Math.round((100 - conversionPercent) * 10) / 10;
        stages.push({
            stage: FUNNEL_STAGE_KEYS[i],
            label: FUNNEL_LABELS[FUNNEL_STAGE_KEYS[i]],
            count,
            conversionPercent: i === 0 ? 100 : conversionPercent,
            dropoffPercent,
            averageTimeHours: avgHours[i] ?? null,
        });
    }
    return stages;
}
export function classifyBuyer(params) {
    if (params.shipmentsCompleted >= 3 && params.ordersCreated >= 3)
        return "Power Buyer";
    if (params.ordersCreated >= 1 && params.daysSince <= 90)
        return "Active";
    if (params.rfqsSubmitted >= 1 && params.daysSince <= 90)
        return "Warm";
    return "Cold";
}
export function classifySupplier(params) {
    if (params.quotationsSubmitted === 0)
        return "Inactive";
    if (isUnknownActivityDays(params.daysSince))
        return "Emerging";
    if (params.daysSince > 90)
        return "Inactive";
    if (params.selectionRate >= 0.25 && params.revenue >= 500)
        return "Top Performer";
    if (params.quotationsSubmitted >= 3 || params.selectionRate > 0)
        return "Active";
    return "Emerging";
}
export function buyerActivationScore(params) {
    let s = 0;
    s += Math.min(20, params.rfqsCreated * 4);
    s += Math.min(20, params.rfqsSubmitted * 5);
    s += Math.min(25, params.ordersCreated * 8);
    s += Math.min(25, params.shipmentsCompleted * 10);
    s += Math.min(10, params.comms);
    if (!isUnknownActivityDays(params.daysSince)) {
        if (params.daysSince <= 7)
            s += 10;
        else if (params.daysSince <= 30)
            s += 5;
        s -= Math.min(30, params.daysSince * 0.5);
    }
    return Math.max(0, Math.min(100, Math.round(s)));
}
export function supplierGrowthScore(params) {
    let s = 0;
    s += Math.min(15, params.invitations * 2);
    s += Math.min(25, params.quotes * 5);
    s += Math.min(30, params.selectionRate * 100);
    s += Math.min(20, params.revenue / 200);
    s += Math.min(10, params.freightRevenue / 100);
    return Math.max(0, Math.min(100, Math.round(s)));
}
//# sourceMappingURL=growth.analytics.js.map