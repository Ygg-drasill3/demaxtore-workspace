import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminBulkContainerApi } from "../lib/bulk-container.api";
import { Button } from "@/components/ui/Button";
import { BC_STATE_LABELS } from "@dmx/contracts/bulk-container.zod";
import type { BulkContainerDTO } from "../lib/bulk-container.api";

type Quote = {
  id: string;
  lineId: string;
  productRef: string;
  productName: string;
  packingType: string;
  supplierCode: string;
  unitPrice: number;
  quantityMt: number;
};

type Offer = {
  id: string;
  offerReference: string;
  version: number;
  status: string;
  offerTotal: number;
  validUntil: string | null;
};

type ProcurementData = {
  container: BulkContainerDTO;
  quotes: Quote[];
  offers: Offer[];
};

export default function AdminBulkContainerProcurementPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [quoteForms, setQuoteForms] = useState<Record<string, { supplierCode: string; unitPrice: string; notes: string }>>({});
  const [offerNotes, setOfferNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bc-admin-procurement", id],
    queryFn: () => adminBulkContainerApi.get(id!) as Promise<ProcurementData>,
    enabled: !!id,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["bc-admin-procurement", id] });

  if (isLoading || !data) {
    return <div data-testid="bc-procurement-loading" className="p-8 animate-pulse">Loading…</div>;
  }

  const { container, quotes, offers } = data;
  const latestDraft = offers.find((o) => o.status === "DRAFT");
  const quoteMap = new Map(quotes.map((q) => [q.lineId, q]));

  const saveQuote = async (lineId: string, _productRef: string) => {
    const form = quoteForms[lineId] ?? { supplierCode: "SUP-001", unitPrice: "350", notes: "" };
    await adminBulkContainerApi.upsertQuote(id!, {
      lineId,
      supplierCode: form.supplierCode,
      unitPrice: Number(form.unitPrice),
      currency: container.currency,
      notes: form.notes || undefined,
    });
    await refresh();
  };

  return (
    <div data-testid="bc-procurement-page" className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/admin/bulk-container" className="text-xs text-zinc-500 hover:underline">← Bulk Inbox</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Procurement · {container.externalRef}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Status: {BC_STATE_LABELS[container.state as keyof typeof BC_STATE_LABELS] ?? container.state}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {container.state === "BC_SUBMITTED" && (
          <Button data-testid="bc-start-procurement" onClick={() => void adminBulkContainerApi.startProcurement(id!).then(refresh)}>
            Start Procurement
          </Button>
        )}
        {container.state === "BC_REVISION_REQUESTED" && (
          <Button data-testid="bc-resume-procurement" onClick={() => void adminBulkContainerApi.resumeProcurement(id!).then(refresh)}>
            Resume Procurement
          </Button>
        )}
      </div>

      <section className="dmx-card p-5" data-testid="bc-procurement-summary">
        <h2 className="font-medium mb-3">Request Summary</h2>
        <p className="text-sm text-zinc-600">{container.currentWeightMt} MT · {container.productCount} products</p>
      </section>

      <section className="dmx-card p-5 overflow-x-auto" data-testid="bc-procurement-pricing">
        <h2 className="font-medium mb-3">Manual Pricing Entry (Operations Only)</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left pb-2">Product</th>
              <th className="text-left pb-2">Packing</th>
              <th className="text-left pb-2">MT</th>
              <th className="text-left pb-2">Specification</th>
              <th className="text-left pb-2">Supplier Code</th>
              <th className="text-left pb-2">USD/MT</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {container.lines.map((line) => {
              const existing = quoteMap.get(line.id);
              const form = quoteForms[line.id] ?? {
                supplierCode: existing?.supplierCode ?? "SUP-001",
                unitPrice: String(existing?.unitPrice ?? line.indicativeUnitLow ?? 350),
                notes: "",
              };
              const specSummary = Object.entries(line.specValues).map(([k, v]) => `${k}: ${v}`).join(" · ");
              return (
                <tr key={line.id} data-testid={`bc-proc-line-${line.productRef}`} className="border-t border-zinc-100">
                  <td className="py-3">{line.name}</td>
                  <td className="py-3">{line.packingTypeName}</td>
                  <td className="py-3">{line.quantityMt}</td>
                  <td className="py-3 text-xs text-zinc-500 max-w-[200px]">{specSummary}</td>
                  <td className="py-3">
                    <input
                      className="h-8 px-2 border rounded text-sm w-28"
                      value={form.supplierCode}
                      data-testid={`bc-supplier-code-${line.productRef}`}
                      onChange={(e) => setQuoteForms((f) => ({ ...f, [line.id]: { ...form, supplierCode: e.target.value } }))}
                    />
                  </td>
                  <td className="py-3">
                    <input
                      className="h-8 px-2 border rounded text-sm w-24"
                      value={form.unitPrice}
                      data-testid={`bc-unit-price-${line.productRef}`}
                      onChange={(e) => setQuoteForms((f) => ({ ...f, [line.id]: { ...form, unitPrice: e.target.value } }))}
                    />
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      className="text-accent-900 text-xs font-medium"
                      data-testid={`bc-save-quote-${line.productRef}`}
                      onClick={() => void saveQuote(line.id, line.productRef)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="dmx-card p-5 space-y-3" data-testid="bc-offer-builder">
        <h2 className="font-medium">Create Bulk Offer</h2>
        <textarea
          className="w-full border rounded-lg p-2 text-sm"
          placeholder="Offer notes (visible to buyer)"
          value={offerNotes}
          onChange={(e) => setOfferNotes(e.target.value)}
          data-testid="bc-offer-notes"
        />
        <div className="flex gap-2">
          <Button
            data-testid="bc-create-offer"
            disabled={!["BC_PROCUREMENT_IN_PROGRESS", "BC_REVISION_REQUESTED", "BC_EXPIRED"].includes(container.state)}
            onClick={() =>
              void adminBulkContainerApi
                .createOffer(id!, { offerNotes: offerNotes || undefined, validityHours: 72 })
                .then(refresh)
            }
          >
            Create Offer
          </Button>
          {latestDraft && (
            <Button
              data-testid="bc-send-offer"
              onClick={() => void adminBulkContainerApi.sendOffer(id!, latestDraft.id).then(refresh)}
            >
              Send to Buyer
            </Button>
          )}
        </div>
        {offers[0] && (
          <p className="text-xs text-zinc-500">
            Latest {offers[0].offerReference} v{offers[0].version} — {offers[0].status} · Total ${offers[0].offerTotal.toLocaleString()}
          </p>
        )}
      </section>
    </div>
  );
}
