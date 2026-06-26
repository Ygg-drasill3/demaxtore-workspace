import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { fetchBuyerTradeDocListPaged } from "@/features/navigation/lib/buyer-portfolio";
import { fetchSupplierTradeDocListPaged } from "@/features/navigation/lib/supplier-portfolio";
import { ListPagination } from "@/features/navigation/components/ListPagination";

const PAGE_SIZE = 25;

export default function TradeDocumentsListPage() {
  const isSupplier = useLocation().pathname.startsWith("/supplier");
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [isSupplier ? "supplier" : "buyer", "trade-doc-list", offset],
    queryFn: () => (isSupplier ? fetchSupplierTradeDocListPaged : fetchBuyerTradeDocListPaged)({ limit: PAGE_SIZE, offset }),
  });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div data-testid="trade-documents-list-page" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <header>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Documents</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Trade Documents</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Compliance and document status across orders and shipments.
        </p>
      </header>

      {isError && (
        <div className="dmx-card p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>Could not load trade document workspaces.</span>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      <div className="dmx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">Workspace</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Compliance</th>
              <th className="text-left px-4 py-3">Approved</th>
              <th className="text-left px-4 py-3">Pending review</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} data-testid="trade-documents-list-empty" className="px-4 py-12 text-center text-zinc-500">
                  No trade document workspaces yet. Documents attach to active orders and shipments.
                </td>
              </tr>
            ) : rows.map((r) => {
              const url = r.workspaceType === "ORDER"
                ? `/workspace/order/${r.workspaceId}?focus=documents`
                : `/workspace/shipment/${r.workspaceId}?focus=documents`;
              return (
                <tr
                  key={`${r.workspaceType}-${r.workspaceId}`}
                  data-testid={`trade-doc-list-row-${r.workspaceId}`}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50"
                >
                  <td className="px-4 py-3 font-mono text-xs">{r.workspaceRef}</td>
                  <td className="px-4 py-3">{r.workspaceType}</td>
                  <td className="px-4 py-3">{r.complianceStatus}</td>
                  <td className="px-4 py-3 tabular-nums">{r.approvedCount}/{r.requiredCount}</td>
                  <td className="px-4 py-3 tabular-nums">{r.pendingReview}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={url} data-testid={`trade-doc-open-${r.workspaceId}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-900 hover:underline">
                      Open workspace <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ListPagination
          offset={offset}
          limit={PAGE_SIZE}
          total={total}
          onPageChange={setOffset}
          testId="trade-doc-list-pagination"
        />
      </div>
    </div>
  );
}
