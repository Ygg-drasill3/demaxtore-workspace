import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, FileText } from "lucide-react";
import { purchaseOrderApi } from "../lib/purchase-order.api";
import { downloadPurchaseOrderPdf, openPurchaseOrderPdf } from "../lib/poPdf";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { useWorkspaceSocket } from "@/lib/socket";
import { useSingleFlight } from "@/lib/useSingleFlight";
import TradeDocumentsTab from "@/features/trade-documents/components/TradeDocumentsTab";
import { OnlinePaymentDisabledNotice } from "@/features/payments/components/OnlinePaymentDisabledNotice";
import ConversationHubPanel from "@/features/conversation-hub/components/ConversationHubPanel";

export default function PoWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [pdfBusy, setPdfBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => purchaseOrderApi.get(id!),
    enabled: !!id,
  });

  const orderWorkspaceId = data?.purchaseOrder?.orderId;

  const refreshPo = useCallback(() => {
    void refetch();
    if (orderWorkspaceId) {
      qc.invalidateQueries({ queryKey: ["purchase-order", "order", orderWorkspaceId] });
    }
  }, [refetch, qc, orderWorkspaceId]);

  useWorkspaceSocket(orderWorkspaceId, {
    [SocketEvents.PO_ISSUED]: refreshPo,
    [SocketEvents.PO_ACKNOWLEDGED]: refreshPo,
    [SocketEvents.PO_AMENDMENT_REQUESTED]: refreshPo,
    [SocketEvents.PO_AMENDMENT_APPROVED]: refreshPo,
    [SocketEvents.PO_AMENDMENT_REJECTED]: refreshPo,
    [SocketEvents.PO_CLOSED]: refreshPo,
  });

  const runPdf = async (mode: "view" | "download") => {
    if (!data) return;
    setPdfBusy(true);
    try {
      if (mode === "view") await openPurchaseOrderPdf(data);
      else await downloadPurchaseOrderPdf(data);
    } catch {
      toast.error("Could not generate PO PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  const { run: runAction, busy: actionBusy } = useSingleFlight(async (path: string, body: unknown) => {
    try {
      await purchaseOrderApi.action(id!, path, body);
      toast.success("Done");
      await refetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? "Action failed");
    }
  });

  if (isLoading || !data || !user) {
    return <div data-testid="po-loading">Loading…</div>;
  }

  const po = data.purchaseOrder;
  const openAmendment = data.amendments.find((a) => a.status === "OPEN");
  const isSupplier = user.role === "SUPPLIER";
  const isBuyer = user.role === "BUYER" || user.role === "ADMIN";

  return (
    <div data-testid="po-workspace" className="max-w-5xl mx-auto space-y-6 p-4">
      <header data-testid="po-header" className="space-y-1">
        <span className="text-xs uppercase text-zinc-500">Purchase order</span>
        <h1 className="text-3xl font-semibold" data-testid="po-number">{po.poNumber}</h1>
        <p data-testid="po-status" className="text-sm text-zinc-600">Status: {po.status}</p>
        <p data-testid="po-source" className="text-sm text-zinc-500">
          {po.source === "manual" ? "Kaynak: Yüklenen belge" : "Kaynak: Sistem üretimi"}
        </p>
        <div className="flex gap-4 text-sm text-zinc-600">
          <span>Currency: {po.currency}</span>
          <span>Incoterm: {po.incoterm ?? "—"}</span>
          <span>Payment: {po.paymentTerms ?? "—"}</span>
        </div>
        <div data-testid="po-payment-notice" className="pt-2">
          <OnlinePaymentDisabledNotice />
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            data-testid="po-linked-order"
            className="text-sm text-blue-600"
            to={`/workspace/order/${po.orderId}`}
          >
            Linked order {po.orderRef ?? po.orderId.slice(0, 8)}
          </Link>
          <button
            type="button"
            data-testid="po-view-pdf"
            disabled={pdfBusy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-paper-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-paper-50 disabled:opacity-60"
            onClick={() => void runPdf("view")}
          >
            <FileText className="h-4 w-4" />
            {po.source === "manual" ? "Yüklenen PO" : "View PDF"}
          </button>
          <button
            type="button"
            data-testid="po-download-pdf"
            disabled={pdfBusy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-60"
            onClick={() => void runPdf("download")}
          >
            <FileDown className="h-4 w-4" />
            {po.source === "manual" ? "Belgeyi indir" : "Download PDF"}
          </button>
        </div>
      </header>

      <ConversationHubPanel
        workspaceType="PO"
        workspaceId={po.id}
        socketWorkspaceId={po.orderId}
        testId="po-communication"
      />

      <section data-testid="po-actions" className="dmx-card p-4 flex flex-wrap gap-2">
        {isSupplier && ["ISSUED", "AMENDED"].includes(po.status) && (
          <>
            <button
              data-testid="po-action-accept"
              className="dmx-btn-primary text-sm disabled:opacity-60"
              disabled={actionBusy}
              onClick={() => runAction("acknowledge-po", { payload: { status: "ACCEPTED" } })}
            >
              Accept PO
            </button>
            <button
              data-testid="po-action-reject"
              className="dmx-btn-secondary text-sm disabled:opacity-60"
              disabled={actionBusy}
              onClick={() => runAction("acknowledge-po", { payload: { status: "REJECTED", notes: "Rejected E2E" } })}
            >
              Reject PO
            </button>
          </>
        )}
        {(isSupplier || isBuyer) && ["ISSUED", "ACKNOWLEDGED", "AMENDED"].includes(po.status) && !openAmendment && (
          <button
            data-testid="po-action-request-amendment"
            className="dmx-btn-secondary text-sm disabled:opacity-60"
            disabled={actionBusy}
            onClick={() => {
              const reason = window.prompt("Amendment reason (required)");
              if (!reason?.trim()) return;
              const proposedLines = data.lines.map((l) => ({
                sku: l.sku ?? undefined,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
              }));
              void runAction("request-amendment", {
                payload: { reason: reason.trim(), proposedLines },
              });
            }}
          >
            Request amendment
          </button>
        )}
        {isBuyer && openAmendment && (
          <>
            <button
              data-testid="po-action-approve-amendment"
              className="dmx-btn-primary text-sm disabled:opacity-60"
              disabled={actionBusy}
              onClick={() =>
                runAction("approve-amendment", {
                  payload: {
                    amendmentId: openAmendment.id,
                    reason: "Approved per commercial terms (E2E)",
                    lines: data.lines.map((l) => ({
                      sku: l.sku ?? undefined,
                      description: l.description,
                      quantity: l.quantity,
                      unitPrice: l.unitPrice,
                    })),
                  },
                })
              }
            >
              Approve amendment
            </button>
            <button
              data-testid="po-action-reject-amendment"
              className="dmx-btn-secondary text-sm disabled:opacity-60"
              disabled={actionBusy}
              onClick={() =>
                runAction("reject-amendment", {
                  payload: {
                    amendmentId: openAmendment.id,
                    reason: "Declined — terms unchanged (E2E)",
                  },
                })
              }
            >
              Reject amendment
            </button>
          </>
        )}
        {isBuyer && ["ACKNOWLEDGED", "AMENDED"].includes(po.status) && (
          <button
            data-testid="po-action-close"
            className="dmx-btn-secondary text-sm disabled:opacity-60"
            disabled={actionBusy}
            onClick={() => runAction("close-po", { payload: { reason: "Fulfilled E2E" } })}
          >
            Close PO
          </button>
        )}
        {isBuyer && !["CANCELLED", "CLOSED"].includes(po.status) && (
          <button
            data-testid="po-action-cancel"
            className="dmx-btn-secondary text-sm text-red-700 disabled:opacity-60"
            disabled={actionBusy}
            onClick={() => {
              const reason = window.prompt("Cancel PO: enter reason (required)");
              if (!reason?.trim()) return;
              void runAction("cancel-po", { payload: { reason: reason.trim() } });
            }}
          >
            Cancel PO
          </button>
        )}
      </section>

      <section data-testid="po-lines" className="dmx-card p-4">
        <h2 className="font-medium mb-2">Lines</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="py-1">SKU</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l) => (
              <tr key={l.id} data-testid={`po-line-${l.id}`}>
                <td className="py-1">{l.sku ?? "—"}</td>
                <td>{l.description}</td>
                <td>{l.quantity}</td>
                <td>{l.unitPrice}</td>
                <td>{l.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section data-testid="po-acknowledgements" className="dmx-card p-4">
        <h2 className="font-medium mb-2">Acknowledgements</h2>
        <ul className="text-sm space-y-1">
          {data.acknowledgements.map((a) => (
            <li key={a.id} data-testid={`po-ack-${a.status}`}>
              {a.status} · {new Date(a.createdAt).toLocaleString()}
              {a.notes ? ` — ${a.notes}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="po-amendments" className="dmx-card p-4">
        <h2 className="font-medium mb-2">Amendments</h2>
        <ul className="text-sm space-y-1">
          {data.amendments.length === 0 && <li className="text-zinc-500">None</li>}
          {data.amendments.map((a) => (
            <li key={a.id} data-testid={`po-amendment-${a.status}`}>
              {a.status}: {a.reason}
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="po-revisions" className="dmx-card p-4">
        <h2 className="font-medium mb-2">Revision history</h2>
        <ul className="text-sm space-y-2">
          {data.revisions.map((r) => (
            <li key={r.id} data-testid={`po-revision-${r.revisionNumber}`}>
              <span className="font-medium">Rev {r.revisionNumber}</span>
              <span className="text-zinc-500 ml-2">{new Date(r.createdAt).toLocaleString()}</span>
              <p className="text-zinc-600">{r.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="po-documents" className="dmx-card p-4">
        <h2 className="font-medium mb-3">Documents</h2>
        <TradeDocumentsTab workspaceType="ORDER" workspaceId={po.orderId} />
      </section>

      <section data-testid="po-timeline" className="dmx-card p-4">
        <h2 className="font-medium mb-2">Timeline</h2>
        <p className="text-xs text-zinc-500">PO events are recorded on the linked order workspace timeline.</p>
      </section>
    </div>
  );
}
