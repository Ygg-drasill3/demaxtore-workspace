// =============================================================================
// Sprint 30-07 — Operational Analytics & KPI (read-only; no owned entities)
// =============================================================================

export const ANALYTICS_TIME_PRESETS = [
  "TODAY",
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "THIS_MONTH",
  "CUSTOM",
] as const;
export type AnalyticsTimePreset = (typeof ANALYTICS_TIME_PRESETS)[number];

export const ANALYTICS_EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type AnalyticsExportFormat = (typeof ANALYTICS_EXPORT_FORMATS)[number];

export const ANALYTICS_EXPORT_SCOPES = [
  "summary",
  "orders",
  "shipments",
  "inspections",
  "tasks",
  "issues",
  "completion",
  "suppliers",
] as const;
export type AnalyticsExportScope = (typeof ANALYTICS_EXPORT_SCOPES)[number];

export interface AnalyticsTimeRangeDto {
  preset: AnalyticsTimePreset;
  from: string;
  to: string;
}

export interface AnalyticsTrendPoint {
  key: string;
  label: string;
  value: number;
  previousValue: number | null;
  deltaPct: number | null;
}

export interface OrdersKpiDto {
  openOrders: number;
  completedOrders: number;
  averageCompletionHours: number | null;
}

export interface ShipmentsKpiDto {
  activeShipments: number;
  delayedShipments: number;
  onTimeDeliveryPct: number | null;
  averageDelayHours: number | null;
}

export interface InspectionsKpiDto {
  requested: number;
  passed: number;
  failed: number;
  passRatePct: number | null;
}

export interface TasksKpiDto {
  open: number;
  overdue: number;
  completedToday: number;
  averageResolutionHours: number | null;
}

export interface IssuesKpiDto {
  open: number;
  critical: number;
  resolvedToday: number;
  averageResolutionHours: number | null;
}

export interface CompletionKpiDto {
  ready: number;
  completedToday: number;
  completionRatePct: number | null;
}

export interface SupplierKpiRowDto {
  supplierUserId: string;
  supplierName: string;
  openOrders: number;
  completedOrders: number;
  inspectionPassPct: number | null;
  shipmentDelayPct: number | null;
  averageLeadTimeDays: number | null;
  averageCompletionHours: number | null;
}

export interface OperationalAnalyticsSummaryDto {
  range: AnalyticsTimeRangeDto;
  generatedAt: string;
  cached: boolean;
  orders: OrdersKpiDto;
  shipments: ShipmentsKpiDto;
  inspections: InspectionsKpiDto;
  tasks: TasksKpiDto;
  issues: IssuesKpiDto;
  completion: CompletionKpiDto;
  trends: AnalyticsTrendPoint[];
  permissions: {
    canView: boolean;
    canViewSuppliers: boolean;
    canExport: boolean;
  };
}

export interface SupplierKpiListDto {
  range: AnalyticsTimeRangeDto;
  items: SupplierKpiRowDto[];
}
