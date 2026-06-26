import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { ExternalLink, FileDown, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchBuyerPoListPaged, type PoListRow } from "@/features/navigation/lib/buyer-portfolio";
import { fetchSupplierPoListPaged, type SupplierPoRow } from "@/features/navigation/lib/supplier-portfolio";
import { ListPagination } from "@/features/navigation/components/ListPagination";

const PAGE_SIZE = 25;
import { purchaseOrderApi } from "../lib/purchase-order.api";
import { downloadPurchaseOrderPdf } from "../lib/poPdf";
import { toast } from "@/store/toast.store";

type PoRow = PoListRow | SupplierPoRow;

export default function PoListPage() {
  const isSupplier = useLocation().pathname.startsWith("/supplier");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery<{ items: PoRow[]; total: number }>({
    queryKey: [isSupplier ? "supplier" : "buyer", "po-list", offset],
    queryFn: async () =>
      isSupplier
        ? fetchSupplierPoListPaged({ limit: PAGE_SIZE, offset })
        : fetchBuyerPoListPaged({ limit: PAGE_SIZE, offset }),
  });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const downloadPdf = async (poId: string) => {
    setDownloadingId(poId);
    try {
      const summary = await purchaseOrderApi.get(poId);
      await downloadPurchaseOrderPdf(summary);
    } catch {
      toast.error("Could not download PO PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div data-testid="po-list-page" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <header>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Execution</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Purchase Orders</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isSupplier
            ? "Purchase orders from buyers — acknowledge and track amendment status."
            : "POs issued from RFQs and CommodityBid awards — acknowledgement and amendment status."}
        </p>
      </header>

      {isError && (
        <div className="dmx-card p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>Could not load purchase orders.</span>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          testId="po-list-empty"
          icon={<ClipboardList className="h-5 w-5" />}
          title="No purchase orders yet"
          body={
            isSupplier
              ? "Purchase orders appear when a buyer awards you an RFQ or CommodityBid lot. Acknowledge incoming POs to confirm production readiness."
              : "POs are issued after you award an RFQ or approve a CommodityBid winner. Award a supplier to spawn your first order."
          }
          action={
            isSupplier ? (
              <Link to="/supplier/rfq" className="dmx-btn-secondary text-sm">View RFQ opportunities</Link>
            ) : (
              <Link to="/buyer/rfq" className="dmx-btn-secondary text-sm">Go to RFQs</Link>
            )
          }
        />
      ) : (
      <div className="dmx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">PO ref</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Order</th>
              <th className="text-left px-4 py-3">{isSupplier ? "Buyer" : "Supplier"}</th>
              <th className="text-left px-4 py-3">Ack pending</th>
              {!isSupplier && <th className="text-left px-4 py-3">Amendments</th>}
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={isSupplier ? 6 : 7} className="px-4 py-12 text-center text-zinc-500">Loading…</td></tr>
            ) : rows.map((r) => (
              <tr key={r.poId} data-testid={`po-list-row-${r.poId}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-4 py-3 font-mono text-xs">{r.poNumber}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.orderRef}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {isSupplier
                    ? ("buyerName" in r ? r.buyerName : "—")
                    : ("supplierName" in r ? r.supplierName || "—" : "—")}
                </td>
                <td className="px-4 py-3">{r.pendingAck ? "Yes" : "—"}</td>
                {!isSupplier && (
                  <td className="px-4 py-3 tabular-nums">
                    {"openAmendments" in r ? r.openAmendments || "—" : "—"}
                  </td>
                )}
                <td className="px-4 py-3 text-right space-x-3">
                  <button
                    type="button"
                    data-testid={`po-list-pdf-${r.poId}`}
                    disabled={downloadingId === r.poId}
                    className="text-sm text-zinc-600 hover:text-ink-900 disabled:opacity-50"
                    onClick={() => void downloadPdf(r.poId)}
                  >
                    <FileDown className="inline h-3.5 w-3.5" /> PDF
                  </button>
                  <Link to={`/workspace/po/${r.poId}`} data-testid={`po-open-${r.poId}`} className="text-sm font-medium text-blue-900 hover:underline">
                    Open PO <ExternalLink className="inline h-3.5 w-3.5" />
                  </Link>
                  <Link to={`/workspace/order/${r.orderId}`} data-testid={`po-order-link-${r.poId}`} className="text-sm text-zinc-500 hover:underline">
                    Order
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ListPagination
          offset={offset}
          limit={PAGE_SIZE}
          total={total}
          onPageChange={setOffset}
          testId="po-list-pagination"
        />
      </div>
      )}
    </div>
  );
}
