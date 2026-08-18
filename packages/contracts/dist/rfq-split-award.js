// =============================================================================
// RFQ line-item split award — types + pure aggregate state helpers
// Destination: packages/contracts/src/rfq-split-award.ts
//
// One winning quotation per RFQ line item. Variations within a line item are
// awarded together as a single offer package (whole quotation row for that product).
// =============================================================================
const TERMINAL_LINE = new Set([
    "AWARDED",
    "NO_AWARD",
    "CANCELLED",
]);
export function isLineAwardTerminal(status) {
    return TERMINAL_LINE.has(status);
}
/** Derive aggregate award state from line item statuses. */
export function computeRfqAwardAggregateState(lines) {
    if (!lines.length)
        return "OPEN";
    const allTerminal = lines.every((l) => isLineAwardTerminal(l.status));
    if (allTerminal)
        return "FULLY_AWARDED";
    const anyAwarded = lines.some((l) => l.status === "AWARDED");
    if (anyAwarded)
        return "PARTIALLY_AWARDED";
    return "OPEN";
}
export function countLinesByStatus(lines) {
    const counts = {
        OPEN: 0,
        AWARDED: 0,
        NO_AWARD: 0,
        CANCELLED: 0,
    };
    for (const l of lines)
        counts[l.status] += 1;
    return counts;
}
/** Lines that may still receive supplier quotations. */
export function openLineItemIds(lines) {
    return lines.filter((l) => l.status === "OPEN").map((l) => l.rfqLineItemId);
}
/** Map workspace FSM state ↔ aggregate award label for UI badges. */
export function rfqAwardAggregateFromWorkspaceState(workspaceState, lines) {
    if (workspaceState === "PARTIALLY_AWARDED")
        return "PARTIALLY_AWARDED";
    if (workspaceState === "FULLY_AWARDED")
        return "FULLY_AWARDED";
    if (["CLOSED", "CLOSED_NO_AWARD", "PO_ISSUED"].includes(workspaceState)) {
        return computeRfqAwardAggregateState(lines);
    }
    if (["RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION"].includes(workspaceState)) {
        return computeRfqAwardAggregateState(lines);
    }
    return "OPEN";
}
