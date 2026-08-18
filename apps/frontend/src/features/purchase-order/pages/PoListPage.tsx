import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ExternalLink, Search, X } from "lucide-react";
import type { PurchaseOrderListItem } from "@dmx/contracts/purchase-order";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/store/auth.store";
import { purchaseOrderApi } from "../lib/purchase-order.api";
import { purchaseOrderKeys } from "../lib/purchase-order.query-keys";
import { purchaseOrderRoutes } from "../lib/purchase-order.routes";
import { toListApiParams } from "../lib/purchase-order.filters";
import { PURCHASE_ORDER_SOURCE_LABELS } from "@dmx/contracts/purchase-order";
import { purchaseOrderStatusLabel } from "../lib/purchase-order.labels";
import {
  formatListTotal,
  formatPoDateShort,
} from "../lib/purchase-order.formatters";
import { PurchaseOrderSourceBadge, PurchaseOrderStatusBadge } from "../components/PurchaseOrderBadges";
import { usePurchaseOrderFilters } from "../hooks/usePurchaseOrderFilters";
import { ListPagination } from "@/features/navigation/components/ListPagination";

const CAN_CREATE = new Set(["BUYER", "ADMIN", "SUPER_ADMIN"]);

export default function PoListPage() {
  const location = useLocation();
  const isSupplier = location.pathname.startsWith("/supplier");
  const user = useAuth((s) => s.user);
  const canCreate = !isSupplier && user && CAN_CREATE.has(user.role);
  const listBase = isSupplier ? purchaseOrderRoutes.listSupplier : purchaseOrderRoutes.listBuyer;

  const { filters, setFilters, clearFilters, clearOne, hasActive } = usePurchaseOrderFilters();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    const next = debouncedSearch.trim() || undefined;
    if (next !== (filters.search ?? undefined)) {
      setFilters({ search: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [supplierSearch, setSupplierSearch] = useState("");
  const debouncedSupplier = useDebouncedValue(supplierSearch, 300);
  const supplierQuery = useQuery({
    queryKey: purchaseOrderKeys.supplierSearch(debouncedSupplier),
    queryFn: () => purchaseOrderApi.searchSuppliers({ search: debouncedSupplier || undefined, limit: 20 }),
    enabled: !isSupplier && debouncedSupplier.trim().length > 0,
  });

  const apiParams = useMemo(() => toListApiParams(filters), [filters]);
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: purchaseOrderKeys.list(apiParams),
    queryFn: () => purchaseOrderApi.list(apiParams),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;
  const pageSize = filters.pageSize;
  const offset = (filters.page - 1) * pageSize;
  const hasAnyPos = total > 0 || hasActive || isLoading;

  const dateError =
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
      ? "Start date cannot be later than end date."
      : null;

  return (
    <div data-testid="po-list-page" data-guide="po-list" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <header data-guide="po-list-header" className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Execution</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Purchase Orders</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isSupplier
              ? "Purchase orders from buyers — acknowledge and track amendment status."
              : "Manage Purchase Orders created directly, from RFQs, reorders, integrations, and legacy imports."}
          </p>
        </div>
        {canCreate && (
          <Link
            to={purchaseOrderRoutes.create}
            className="dmx-btn-primary text-sm shrink-0 self-start"
            data-testid="po-list-create-direct"
          >
            Create Purchase Order
          </Link>
        )}
      </header>

      <section
        data-testid="po-list-filters"
        className="dmx-card p-4 space-y-3"
        aria-label="Purchase Order filters"
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end flex-wrap">
          <label className="flex-1 min-w-[200px] text-xs text-zinc-500">
            Search
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" aria-hidden />
              <input
                data-testid="po-list-search"
                className="dmx-input pl-9 w-full"
                placeholder="Search by PO number, supplier, buyer reference, or product"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </label>

          <label className="text-xs text-zinc-500">
            Source
            <select
              data-testid="po-list-filter-source"
              className="dmx-input mt-1 min-w-[160px]"
              value={filters.source ?? ""}
              onChange={(e) =>
                setFilters({ source: (e.target.value || undefined) as typeof filters.source })
              }
            >
              <option value="">All sources</option>
              {Object.entries(PURCHASE_ORDER_SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-zinc-500">
            Status
            <select
              data-testid="po-list-filter-status"
              className="dmx-input mt-1 min-w-[180px]"
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters({ status: (e.target.value || undefined) as typeof filters.status })
              }
            >
              <option value="">All statuses</option>
              {(["DRAFT", "SUBMITTED", "APPROVED", "IN_EXECUTION", "COMPLETED", "CLOSED", "CANCELLED"] as const).map(
                (s) => (
                  <option key={s} value={s}>{purchaseOrderStatusLabel(s)}</option>
                ),
              )}
            </select>
          </label>

          {!isSupplier && (
            <div className="text-xs text-zinc-500 min-w-[200px]">
              Supplier
              {filters.supplierId ? (
                <div className="mt-1 flex items-center gap-2">
                  <span className="dmx-input flex-1 truncate" data-testid="po-list-supplier-selected">
                    {filters.supplierName ?? filters.supplierId}
                  </span>
                  <button
                    type="button"
                    className="text-zinc-500 hover:text-ink-900"
                    aria-label="Clear supplier filter"
                    onClick={() => clearOne("supplierId")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <input
                    data-testid="po-list-filter-supplier"
                    className="dmx-input w-full"
                    placeholder="Search suppliers"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                  />
                  {supplierQuery.data && supplierQuery.data.length > 0 && supplierSearch.trim() && (
                    <ul className="absolute z-20 mt-1 w-full rounded-lg border border-paper-200 bg-white shadow-lg max-h-48 overflow-auto">
                      {supplierQuery.data.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-paper-50"
                            data-testid={`po-list-supplier-option-${s.id}`}
                            onClick={() => {
                              setFilters({ supplierId: s.id, supplierName: s.companyName });
                              setSupplierSearch("");
                            }}
                          >
                            {s.companyName}
                            {s.countryCode ? ` · ${s.countryCode}` : ""}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="text-xs text-zinc-500">
            Issued from
            <input
              type="date"
              data-testid="po-list-filter-date-from"
              className="dmx-input mt-1"
              value={filters.dateFrom ?? ""}
              onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
            />
          </label>
          <label className="text-xs text-zinc-500">
            Issued to
            <input
              type="date"
              data-testid="po-list-filter-date-to"
              className="dmx-input mt-1"
              value={filters.dateTo ?? ""}
              onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
            />
          </label>

          <label className="text-xs text-zinc-500">
            Sort
            <select
              data-testid="po-list-sort"
              className="dmx-input mt-1"
              value={`${filters.sort}:${filters.direction}`}
              onChange={(e) => {
                const [sort, direction] = e.target.value.split(":") as [typeof filters.sort, "asc" | "desc"];
                setFilters({ sort, direction }, { resetPage: false });
              }}
            >
              <option value="issuedAt:desc">Issued (newest)</option>
              <option value="issuedAt:asc">Issued (oldest)</option>
              <option value="createdAt:desc">Created (newest)</option>
              <option value="poNumber:asc">PO number</option>
              <option value="status:asc">Status</option>
              <option value="total:desc">Total</option>
            </select>
          </label>

          {hasActive && (
            <button
              type="button"
              data-testid="po-list-clear-filters"
              className="dmx-btn-secondary text-sm self-end"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {dateError && (
          <p className="text-sm text-red-700" role="alert">{dateError}</p>
        )}

        {hasActive && (
          <div className="flex flex-wrap gap-2" data-testid="po-list-active-filters">
            {filters.source && (
              <FilterChip
                label={`Source: ${PURCHASE_ORDER_SOURCE_LABELS[filters.source]}`}
                onRemove={() => clearOne("source")}
              />
            )}
            {filters.status && (
              <FilterChip
                label={`Status: ${purchaseOrderStatusLabel(filters.status)}`}
                onRemove={() => clearOne("status")}
              />
            )}
            {filters.supplierId && (
              <FilterChip
                label={`Supplier: ${filters.supplierName ?? filters.supplierId}`}
                onRemove={() => clearOne("supplierId")}
              />
            )}
            {filters.search && (
              <FilterChip label={`Search: ${filters.search}`} onRemove={() => { setSearchInput(""); clearOne("search"); }} />
            )}
          </div>
        )}

        {isFetching && !isLoading && (
          <p className="text-xs text-zinc-400" aria-live="polite">Updating…</p>
        )}
      </section>

      {isError && (
        <div className="dmx-card p-4 text-sm text-red-700 flex items-center justify-between gap-3" data-testid="po-list-error">
          <span>Unable to load Purchase Orders.</span>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 ? (
        <div data-guide="po-list-empty">
          {hasActive ? (
            <EmptyState
              testId="po-list-empty-filtered"
              icon={<ClipboardList className="h-5 w-5" />}
              title="No Purchase Orders match your filters"
              body="Try adjusting search or filters to see more results."
              action={
                <button type="button" className="dmx-btn-secondary text-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              testId="po-list-empty"
              icon={<ClipboardList className="h-5 w-5" />}
              title="No Purchase Orders yet"
              body={
                isSupplier
                  ? "Purchase orders appear when a buyer awards you an RFQ or creates a direct Purchase Order."
                  : "Create a Purchase Order directly or issue one from an RFQ."
              }
              action={
                canCreate ? (
                  <Link to={purchaseOrderRoutes.create} className="dmx-btn-primary text-sm">
                    Create Purchase Order
                  </Link>
                ) : isSupplier ? (
                  <Link to="/supplier/rfq" className="dmx-btn-secondary text-sm">View RFQ opportunities</Link>
                ) : (
                  <Link to="/buyer/rfq" className="dmx-btn-secondary text-sm">View RFQs</Link>
                )
              }
            />
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block dmx-card overflow-hidden" data-guide="po-list-table" data-testid="po-list-table">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-3">PO Number</th>
                  <th className="text-left px-4 py-3">{isSupplier ? "Buyer" : "Supplier"}</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Issued</th>
                  <th className="text-left px-4 py-3">Expected</th>
                  <th className="text-left px-4 py-3">Lines</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Order Workspace</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-zinc-100 animate-pulse">
                      <td colSpan={9} className="px-4 py-4"><div className="h-4 bg-zinc-100 rounded w-3/4" /></td>
                    </tr>
                  ))
                ) : (
                  items.map((row) => (
                    <PoListRow key={row.id} row={row} isSupplier={isSupplier} listBase={listBase} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-3" data-testid="po-list-mobile">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="dmx-card p-4 h-28 animate-pulse bg-zinc-50" />
                ))
              : items.map((row) => (
                  <PoListCard key={row.id} row={row} isSupplier={isSupplier} />
                ))}
          </ul>

          {hasAnyPos && (
            <ListPagination
              offset={offset}
              limit={pageSize}
              total={total}
              onPageChange={(nextOffset) =>
                setFilters({ page: Math.floor(nextOffset / pageSize) + 1 }, { resetPage: false })
              }
              testId="po-list-pagination"
            />
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-paper-200 bg-paper-50 px-2.5 py-1 text-xs text-ink-800">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-red-700" aria-label={`Remove ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function PoListRow({
  row,
  isSupplier,
}: {
  row: PurchaseOrderListItem;
  isSupplier: boolean;
  listBase: string;
}) {
  return (
    <tr data-testid={`po-list-row-${row.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
      <td className="px-4 py-3">
        <Link
          to={purchaseOrderRoutes.detail(row.id)}
          data-testid={`po-open-${row.id}`}
          className="font-medium text-blue-900 hover:underline break-words"
        >
          {row.poNumber}
        </Link>
        {row.buyerReference ? (
          <p className="text-xs text-zinc-500 mt-0.5">{row.buyerReference}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {isSupplier ? (row.buyer?.companyName ?? "—") : row.supplier.companyName}
      </td>
      <td className="px-4 py-3"><PurchaseOrderSourceBadge source={row.source} /></td>
      <td className="px-4 py-3"><PurchaseOrderStatusBadge status={row.status} /></td>
      <td className="px-4 py-3 text-zinc-600">
        {row.issuedAt ? formatPoDateShort(row.issuedAt) : "Not issued"}
      </td>
      <td className="px-4 py-3 text-zinc-600">
        {row.expectedDeliveryDate ? formatPoDateShort(row.expectedDeliveryDate) : "Not specified"}
      </td>
      <td className="px-4 py-3 tabular-nums">
        {row.lineCount} {row.lineCount === 1 ? "line" : "lines"}
      </td>
      <td className="px-4 py-3 tabular-nums">
        {formatListTotal(row.totalAmount, row.currency, row.pricingState)}
      </td>
      <td className="px-4 py-3 text-right">
        {row.orderId ? (
          <Link
            to={purchaseOrderRoutes.orderWorkspace(row.orderId)}
            data-testid={`po-order-link-${row.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Open workspace <ExternalLink className="inline h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-sm text-zinc-400">Unavailable</span>
        )}
      </td>
    </tr>
  );
}

function PoListCard({ row, isSupplier }: { row: PurchaseOrderListItem; isSupplier: boolean }) {
  return (
    <li data-testid={`po-list-card-${row.id}`} className="dmx-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Link to={purchaseOrderRoutes.detail(row.id)} className="font-semibold text-blue-900 break-words">
          {row.poNumber}
        </Link>
        <PurchaseOrderStatusBadge status={row.status} />
      </div>
      <p className="text-sm text-zinc-700">
        {isSupplier ? (row.buyer?.companyName ?? "—") : row.supplier.companyName}
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <PurchaseOrderSourceBadge source={row.source} />
        <span className="text-xs text-zinc-500">
          Issued: {row.issuedAt ? formatPoDateShort(row.issuedAt) : "Not issued"}
        </span>
      </div>
      <p className="text-sm tabular-nums">
        {formatListTotal(row.totalAmount, row.currency, row.pricingState)}
      </p>
      <div className="flex gap-3 pt-1">
        <Link to={purchaseOrderRoutes.detail(row.id)} className="text-sm font-medium text-blue-900">
          Open Purchase Order
        </Link>
        {row.orderId ? (
          <Link to={purchaseOrderRoutes.orderWorkspace(row.orderId)} className="text-sm text-zinc-600">
            Open Order Workspace
          </Link>
        ) : null}
      </div>
    </li>
  );
}
