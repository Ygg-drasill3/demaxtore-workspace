import type { PurchaseOrderSource, PurchaseOrderStatus, PurchaseOrderSortField } from "@dmx/contracts/purchase-order";

export interface PurchaseOrderListFilters {
  search?: string;
  source?: PurchaseOrderSource;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  supplierName?: string;
  dateFrom?: string;
  dateTo?: string;
  sort: PurchaseOrderSortField;
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_PO_LIST_FILTERS: PurchaseOrderListFilters = {
  sort: "issuedAt",
  direction: "desc",
  page: 1,
  pageSize: 25,
};

const SOURCES = new Set(["RFQ", "DIRECT", "REORDER", "API", "LEGACY"]);
const STATUSES = new Set([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "IN_EXECUTION",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
  // legacy aliases still accepted in URL filters
  "ISSUED",
  "ACKNOWLEDGED",
  "AMENDMENT_REQUESTED",
  "AMENDED",
]);
const SORTS = new Set([
  "issuedAt", "createdAt", "poNumber", "expectedDeliveryDate", "supplier", "status", "total",
]);

function parsePage(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

export function parsePurchaseOrderListFilters(
  params: URLSearchParams,
): PurchaseOrderListFilters {
  const search = params.get("search")?.trim() || undefined;
  const sourceRaw = params.get("source")?.toUpperCase();
  const statusRaw = params.get("status")?.toUpperCase();
  const sortRaw = params.get("sort") ?? "issuedAt";
  const directionRaw = params.get("direction") ?? "desc";
  const dateFrom = params.get("dateFrom") || undefined;
  const dateTo = params.get("dateTo") || undefined;

  const filters: PurchaseOrderListFilters = {
    search,
    source: sourceRaw && SOURCES.has(sourceRaw) ? (sourceRaw as PurchaseOrderSource) : undefined,
    status: statusRaw && STATUSES.has(statusRaw) ? (statusRaw as PurchaseOrderStatus) : undefined,
    supplierId: params.get("supplierId") || undefined,
    supplierName: params.get("supplierName") || undefined,
    dateFrom,
    dateTo,
    sort: SORTS.has(sortRaw) ? (sortRaw as PurchaseOrderSortField) : "issuedAt",
    direction: directionRaw === "asc" ? "asc" : "desc",
    page: parsePage(params.get("page"), 1),
    pageSize: [10, 25, 50, 100].includes(Number(params.get("pageSize")))
      ? Number(params.get("pageSize"))
      : 25,
  };

  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    // Invalid range — drop dates rather than sending bad query
    filters.dateFrom = undefined;
    filters.dateTo = undefined;
  }

  return filters;
}

export function serializePurchaseOrderListFilters(
  filters: PurchaseOrderListFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.source) params.set("source", filters.source);
  if (filters.status) params.set("status", filters.status);
  if (filters.supplierId) params.set("supplierId", filters.supplierId);
  if (filters.supplierName) params.set("supplierName", filters.supplierName);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sort !== "issuedAt") params.set("sort", filters.sort);
  if (filters.direction !== "desc") params.set("direction", filters.direction);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}

export function hasActivePurchaseOrderFilters(filters: PurchaseOrderListFilters): boolean {
  return Boolean(
    filters.search ||
      filters.source ||
      filters.status ||
      filters.supplierId ||
      filters.dateFrom ||
      filters.dateTo,
  );
}

export function toListApiParams(filters: PurchaseOrderListFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page,
    pageSize: filters.pageSize,
    sort: filters.sort,
    direction: filters.direction,
  };
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.source) params.source = filters.source;
  if (filters.status) params.status = filters.status;
  if (filters.supplierId) params.supplierId = filters.supplierId;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  return params;
}

export function purchaseOrderListPath(
  basePath: string,
  filters: Partial<PurchaseOrderListFilters>,
): string {
  const merged = { ...DEFAULT_PO_LIST_FILTERS, ...filters };
  const qs = serializePurchaseOrderListFilters(merged).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
