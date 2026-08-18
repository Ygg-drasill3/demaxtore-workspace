import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_PO_LIST_FILTERS,
  hasActivePurchaseOrderFilters,
  parsePurchaseOrderListFilters,
  serializePurchaseOrderListFilters,
  type PurchaseOrderListFilters,
} from "../lib/purchase-order.filters";

export function usePurchaseOrderFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => parsePurchaseOrderListFilters(searchParams),
    [searchParams],
  );

  const setFilters = useCallback(
    (patch: Partial<PurchaseOrderListFilters>, opts?: { resetPage?: boolean }) => {
      const next: PurchaseOrderListFilters = {
        ...filters,
        ...patch,
        page: opts?.resetPage === false ? (patch.page ?? filters.page) : (patch.page ?? 1),
      };
      // When changing non-page fields, force page 1 unless explicitly preserving
      if (opts?.resetPage !== false && patch.page == null) {
        const pageOnly =
          Object.keys(patch).length === 1 && ("page" in patch || "pageSize" in patch);
        if (!pageOnly && !("page" in patch)) next.page = 1;
      }
      setSearchParams(serializePurchaseOrderListFilters(next), { replace: true });
    },
    [filters, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      serializePurchaseOrderListFilters({
        ...DEFAULT_PO_LIST_FILTERS,
        pageSize: filters.pageSize,
      }),
      { replace: true },
    );
  }, [filters.pageSize, setSearchParams]);

  const clearOne = useCallback(
    (key: keyof PurchaseOrderListFilters) => {
      const next = { ...filters, page: 1 };
      if (key === "supplierId") {
        next.supplierId = undefined;
        next.supplierName = undefined;
      } else if (key === "sort" || key === "direction" || key === "page" || key === "pageSize") {
        // keep defaults
      } else {
        (next as Record<string, unknown>)[key] = undefined;
      }
      setSearchParams(serializePurchaseOrderListFilters(next), { replace: true });
    },
    [filters, setSearchParams],
  );

  return {
    filters,
    setFilters,
    clearFilters,
    clearOne,
    hasActive: hasActivePurchaseOrderFilters(filters),
  };
}
