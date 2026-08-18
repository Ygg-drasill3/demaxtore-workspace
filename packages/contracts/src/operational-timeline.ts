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
] as const;
export type OperationalEventCategory = (typeof OPERATIONAL_EVENT_CATEGORIES)[number];

export const OPERATIONAL_EVENT_SEVERITIES = ["info", "success", "warning"] as const;
export type OperationalEventSeverity = (typeof OPERATIONAL_EVENT_SEVERITIES)[number];

export const OPERATIONAL_EVENT_CATEGORY_LABELS: Record<OperationalEventCategory, string> = {
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
export const OPERATIONAL_EVENT_SOURCE_PRIORITY: Record<string, number> = {
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

export interface OperationalTimelineActor {
  id: string;
  name: string;
}

export interface OperationalTimelineRelatedEntity {
  type: string;
  id: string;
}

export interface OperationalTimelineEvent {
  id: string;
  purchaseOrderId: string;
  orderId?: string | null;
  category: OperationalEventCategory;
  source: string;
  occurredAt: string;
  actor?: OperationalTimelineActor | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  icon?: string | null;
  severity?: OperationalEventSeverity | null;
  relatedEntity?: OperationalTimelineRelatedEntity | null;
}

export interface OperationalTimelineListResponse {
  items: OperationalTimelineEvent[];
  page: number;
  pageSize: number;
  total: number;
  availableCategories: OperationalEventCategory[];
  availableSources: string[];
}

export function operationalEventCategoryLabel(category: OperationalEventCategory): string {
  return OPERATIONAL_EVENT_CATEGORY_LABELS[category] ?? category;
}

export function compareOperationalTimelineEvents(
  a: Pick<OperationalTimelineEvent, "id" | "occurredAt" | "source">,
  b: Pick<OperationalTimelineEvent, "id" | "occurredAt" | "source">,
): number {
  const ta = Date.parse(a.occurredAt);
  const tb = Date.parse(b.occurredAt);
  if (tb !== ta) return tb - ta;
  const pa = OPERATIONAL_EVENT_SOURCE_PRIORITY[a.source] ?? 0;
  const pb = OPERATIONAL_EVENT_SOURCE_PRIORITY[b.source] ?? 0;
  if (pb !== pa) return pb - pa;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export type TimelineGroupKey = "today" | "yesterday" | "last7" | "older";

export function resolveTimelineGroupKey(
  occurredAtIso: string,
  now: Date = new Date(),
): TimelineGroupKey {
  const occurred = new Date(occurredAtIso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfLast7 = new Date(startOfToday);
  startOfLast7.setDate(startOfLast7.getDate() - 6);

  if (occurred >= startOfToday) return "today";
  if (occurred >= startOfYesterday) return "yesterday";
  if (occurred >= startOfLast7) return "last7";
  return "older";
}

export const TIMELINE_GROUP_LABELS: Record<TimelineGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  older: "Older",
};
