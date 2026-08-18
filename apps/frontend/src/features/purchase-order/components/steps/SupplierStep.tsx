import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import type { SupplierSearchItem } from "@dmx/contracts/purchase-order.zod";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { purchaseOrderApi } from "../../lib/purchase-order.api";
import { CreateSupplierDialog } from "../CreateSupplierDialog";
import type { DirectPoWizardState } from "../../lib/direct-po-wizard.types";
import type { FieldErrors } from "../../lib/direct-po-wizard.utils";
import { cn } from "@/lib/utils";

interface Props {
  state: DirectPoWizardState;
  errors: FieldErrors;
  onSelectSupplier: (supplier: SupplierSearchItem | null) => void;
}

export function SupplierStep({ state, errors, onSelectSupplier }: Props) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["po-supplier-search", debouncedSearch],
    queryFn: () =>
      purchaseOrderApi.searchSuppliers({
        search: debouncedSearch.trim() || undefined,
        limit: 20,
      }),
    enabled: mode === "existing" && !state.supplier && debouncedSearch.trim().length > 0,
  });

  const showEmptyHint = !state.supplier && !debouncedSearch.trim();
  const showNoResults = !state.supplier && debouncedSearch.trim() && !isFetching && results.length === 0;

  return (
    <div className="space-y-4" data-testid="direct-po-supplier-step">
      <div className="inline-flex rounded-lg border border-paper-200 p-0.5 bg-white" role="tablist" aria-label="Supplier source">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "existing"}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold dmx-focus-ring",
            mode === "existing" ? "bg-accent-900 text-white" : "text-zinc-600 hover:bg-paper-50",
          )}
          onClick={() => setMode("existing")}
        >
          Existing supplier
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "new"}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold dmx-focus-ring",
            mode === "new" ? "bg-accent-900 text-white" : "text-zinc-600 hover:bg-paper-50",
          )}
          onClick={() => {
            setMode("new");
            setDialogOpen(true);
          }}
        >
          New supplier
        </button>
      </div>

      {errors.supplier && (
        <p className="text-sm text-red-600" role="alert">{errors.supplier}</p>
      )}

      {state.supplier ? (
        <div className="dmx-card p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3" data-testid="selected-supplier-summary">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-zinc-500 text-xs">Company</dt>
              <dd className="font-medium">{state.supplier.companyName}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Country</dt>
              <dd>{state.supplier.countryName ?? state.supplier.countryCode ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Primary contact</dt>
              <dd>{state.supplier.primaryContactName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Email</dt>
              <dd>{state.supplier.primaryContactEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Supplier code</dt>
              <dd className="font-mono text-xs">{state.supplier.supplierCode ?? "—"}</dd>
            </div>
          </dl>
          <div className="flex gap-2 shrink-0">
            <button type="button" className="dmx-btn-secondary text-xs" onClick={() => onSelectSupplier(null)}>
              Change
            </button>
            <button type="button" className="dmx-btn-secondary text-xs inline-flex items-center gap-1" onClick={() => onSelectSupplier(null)} aria-label="Clear supplier">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>
      ) : mode === "existing" ? (
        <>
          <label className="block text-xs text-zinc-600">
            Search suppliers
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" aria-hidden />
              <input
                className="dmx-input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for a supplier..."
                data-testid="supplier-search-input"
              />
            </div>
          </label>

          {showEmptyHint && (
            <p className="text-sm text-zinc-500">Search for a supplier...</p>
          )}

          {showNoResults && (
            <div className="dmx-card p-4 text-sm text-zinc-600 space-y-2">
              <p>No suppliers found.</p>
              <button type="button" className="dmx-btn-secondary text-xs" onClick={() => setDialogOpen(true)}>
                Create a new supplier
              </button>
            </div>
          )}

          {isFetching && <p className="text-sm text-zinc-500">Searching…</p>}

          <ul className="space-y-2" role="list">
            {results.map((supplier) => (
              <li key={supplier.id}>
                <button
                  type="button"
                  className="dmx-card w-full p-4 text-left hover:border-accent-900/30 transition-colors dmx-focus-ring"
                  onClick={() => onSelectSupplier(supplier)}
                  data-testid={`supplier-result-${supplier.id}`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <p className="font-medium">{supplier.companyName}</p>
                    <p className="text-zinc-600">{supplier.countryName ?? supplier.countryCode ?? "—"}</p>
                    <p className="text-zinc-600">{supplier.primaryContactName ?? "—"}</p>
                    <p className="text-zinc-600">{supplier.primaryContactEmail ?? "—"}</p>
                    <p className="font-mono text-xs text-zinc-500 sm:col-span-2">
                      {supplier.supplierCode ?? "No supplier code"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="dmx-card p-4 text-sm text-zinc-600">
          <p>Create a supplier record to continue.</p>
          <button type="button" className="dmx-btn-primary text-xs mt-3" onClick={() => setDialogOpen(true)}>
            Open create supplier dialog
          </button>
        </div>
      )}

      <CreateSupplierDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(supplier) => {
          onSelectSupplier(supplier);
          setMode("existing");
        }}
      />
    </div>
  );
}
