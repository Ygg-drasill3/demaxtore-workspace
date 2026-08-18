export declare const OPERATIONAL_EVENT_CATEGORIES: readonly ["PURCHASE_ORDER", "REVISION", "DOCUMENT", "INSPECTION", "SHIPMENT", "TASK", "ISSUE", "TRADE", "APPROVAL", "SYSTEM", "OTHER"];
export type OperationalEventCategory = (typeof OPERATIONAL_EVENT_CATEGORIES)[number];
export declare const OPERATIONAL_EVENT_SEVERITIES: readonly ["info", "success", "warning"];
export type OperationalEventSeverity = (typeof OPERATIONAL_EVENT_SEVERITIES)[number];
export declare const OPERATIONAL_EVENT_CATEGORY_LABELS: Record<OperationalEventCategory, string>;
/** Higher = preferred when occurredAt ties (DESC). */
export declare const OPERATIONAL_EVENT_SOURCE_PRIORITY: Record<string, number>;
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
export declare function operationalEventCategoryLabel(category: OperationalEventCategory): string;
export declare function compareOperationalTimelineEvents(a: Pick<OperationalTimelineEvent, "id" | "occurredAt" | "source">, b: Pick<OperationalTimelineEvent, "id" | "occurredAt" | "source">): number;
export type TimelineGroupKey = "today" | "yesterday" | "last7" | "older";
export declare function resolveTimelineGroupKey(occurredAtIso: string, now?: Date): TimelineGroupKey;
export declare const TIMELINE_GROUP_LABELS: Record<TimelineGroupKey, string>;
