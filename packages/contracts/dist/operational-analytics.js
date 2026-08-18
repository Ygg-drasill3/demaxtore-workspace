// =============================================================================
// Sprint 30-07 — Operational Analytics & KPI (read-only; no owned entities)
// =============================================================================
export const ANALYTICS_TIME_PRESETS = [
    "TODAY",
    "LAST_7_DAYS",
    "LAST_30_DAYS",
    "THIS_MONTH",
    "CUSTOM",
];
export const ANALYTICS_EXPORT_FORMATS = ["csv", "xlsx"];
export const ANALYTICS_EXPORT_SCOPES = [
    "summary",
    "orders",
    "shipments",
    "inspections",
    "tasks",
    "issues",
    "completion",
    "suppliers",
];
