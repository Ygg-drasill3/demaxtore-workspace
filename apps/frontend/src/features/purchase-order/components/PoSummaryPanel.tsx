import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { purchaseOrderApi } from "../lib/purchase-order.api";
import { openPurchaseOrderPdf } from "../lib/poPdf";
import { toast } from "@/store/toast.store";

export default function PoSummaryPanel({ orderId }: { orderId: string }) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["purchase-order", "order", orderId],
    queryFn: () => purchaseOrderApi.byOrder(orderId),
    retry: false,
  });

  if (isLoading) {
    return (
      <section data-testid="order-po-summary" className="dmx-card p-4 text-sm text-zinc-500">
        Loading purchase order…
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section data-testid="order-po-summary" className="dmx-card p-4 text-sm text-zinc-500">
        No purchase order linked yet.
      </section>
    );
  }

  const po = data.purchaseOrder;
  const total = data.lines.reduce((s, l) => s + l.lineTotal, 0);

  return (
    <section data-testid="order-po-summary" className="dmx-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-medium">Purchase order</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="order-po-view-pdf"
            disabled={pdfBusy}
            className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-ink-900 disabled:opacity-50"
            onClick={async () => {
              setPdfBusy(true);
              try {
                await openPurchaseOrderPdf(data);
              } catch {
                toast.error("Could not open PO PDF");
              } finally {
                setPdfBusy(false);
              }
            }}
          >
            <FileText className="h-3.5 w-3.5" /> {po.source === "manual" ? "Yüklenen PO" : "View PDF"}
          </button>
          <Link
            data-testid="order-po-workspace-link"
            className="text-sm text-blue-600"
            to={`/workspace/po/${po.id}`}
          >
            Open PO workspace
          </Link>
        </div>
      </div>
      <div className="text-sm text-zinc-600 grid grid-cols-2 gap-2">
        <span data-testid="order-po-number">PO: {po.poNumber}</span>
        <span data-testid="order-po-status">Status: {po.status}</span>
        <span data-testid="order-po-source" className="col-span-2 text-zinc-500">
          {po.source === "manual" ? "Kaynak: Yüklenen belge" : "Kaynak: Sistem üretimi"}
        </span>
        <span>Currency: {po.currency}</span>
        <span data-testid="order-po-value">Value: {total.toLocaleString()}</span>
        {data.pendingAcknowledgement && (
          <span data-testid="order-po-pending-ack" className="text-amber-700 col-span-2">
            Acknowledgement pending
          </span>
        )}
        {data.openAmendments > 0 && (
          <span data-testid="order-po-open-amendments" className="text-amber-700 col-span-2">
            {data.openAmendments} open amendment(s)
          </span>
        )}
      </div>
    </section>
  );
}
