// =============================================================================
// Sprint 29-03 — Operational Timeline / Event Center (aggregation DTO)
// =============================================================================
export const OPERATIONAL_EVENT_CATEGORIES = [
    "PURCHASE_ORDER",
    "REVISION",
    "DOCUMENT",
    "INSPECTION",
    "SHIPMENT",
    "TASK",
    "ISSUE",
    "TRADE",
    "APPROVAL",
    "SYSTEM",
    "OTHER",
];
export const OPERATIONAL_EVENT_SEVERITIES = ["info", "success", "warning"];
export const OPERATIONAL_EVENT_CATEGORY_LABELS = {
    PURCHASE_ORDER: "Purchase Order",
    REVISION: "Revision",
    DOCUMENT: "Document",
    INSPECTION: "Inspection",
    SHIPMENT: "Shipment",
    TASK: "Task",
    ISSUE: "Issue",
    TRADE: "Trade",
    APPROVAL: "Approval",
    SYSTEM: "System",
    OTHER: "Other",
};
/** Higher = preferred when occurredAt ties (DESC). */
export const OPERATIONAL_EVENT_SOURCE_PRIORITY = {
    revision: 100,
    purchase_order: 90,
    timeline: 80,
    commercial_document: 70,
    inspection: 60,
    shipment: 50,
    trade: 40,
    audit: 30,
    system: 20,
};
export function operationalEventCategoryLabel(category) {
    return OPERATIONAL_EVENT_CATEGORY_LABELS[category] ?? category;
}
export function compareOperationalTimelineEvents(a, b) {
    const ta = Date.parse(a.occurredAt);
    const tb = Date.parse(b.occurredAt);
    if (tb !== ta)
        return tb - ta;
    const pa = OPERATIONAL_EVENT_SOURCE_PRIORITY[a.source] ?? 0;
    const pb = OPERATIONAL_EVENT_SOURCE_PRIORITY[b.source] ?? 0;
    if (pb !== pa)
        return pb - pa;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
export function resolveTimelineGroupKey(occurredAtIso, now = new Date()) {
    const occurred = new Date(occurredAtIso);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfLast7 = new Date(startOfToday);
    startOfLast7.setDate(startOfLast7.getDate() - 6);
    if (occurred >= startOfToday)
        return "today";
    if (occurred >= startOfYesterday)
        return "yesterday";
    if (occurred >= startOfLast7)
        return "last7";
    return "older";
}
export const TIMELINE_GROUP_LABELS = {
    today: "Today",
    yesterday: "Yesterday",
    last7: "Last 7 Days",
    older: "Older",
};
