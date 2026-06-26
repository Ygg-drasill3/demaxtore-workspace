import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminMixedContainerApi } from "../lib/mixed-container.api";
import { Button } from "@/components/ui/Button";
import { MC_STATE_LABELS } from "@dmx/contracts/mixed-container.zod";
import type { MixedContainerDTO } from "@dmx/contracts/mixed-container.zod";

type Quote = {
  id: string;
  containerLineId: string;
  productRef: string;
  productName: string;
  supplierCode: string;
  exwPrice: number;
  currency: string;
  priceUnit: string;
  notes: string | null;
};

type Offer = {
  id: string;
  version: number;
  status: string;
  offerTotal: number;
  validityDate: string | null;
};

type ProcurementData = {
  container: MixedContainerDTO;
  buyerNotes: string | null;
  categories: string[];
  quotes: Quote[];
  offers: Offer[];
};

export default function AdminMixedContainerProcurementPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [quoteForms, setQuoteForms] = useState<Record<string, { supplierCode: string; exwPrice: string; notes: string }>>({});
  const [fee, setFee] = useState("500");
  const [freight, setFreight] = useState("1200");
  const [offerNotes, setOfferNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mc-admin-procurement", id],
    queryFn: () => adminMixedContainerApi.get(id!) as Promise<ProcurementData>,
    enabled: !!id,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["mc-admin-procurement", id] });

  if (isLoading || !data) {
    return <div data-testid="mc-procurement-loading" className="p-8 animate-pulse">Loading…</div>;
  }

  const { container, quotes, offers } = data;
  const latestDraft = offers.find((o) => o.status === "DRAFT");
  const quoteMap = new Map(quotes.map((q) => [q.containerLineId, q]));

  const saveQuote = async (lineId: string) => {
    const form = quoteForms[lineId] ?? { supplierCode: "SUP-001", exwPrice: "1000", notes: "" };
    await adminMixedContainerApi.upsertQuote(id!, {
      containerLineId: lineId,
      supplierCode: form.supplierCode,
      exwPrice: Number(form.exwPrice),
      currency: container.currency,
      priceUnit: "PALLET",
      notes: form.notes || undefined,
    });
    await refresh();
  };

  return (
    <div data-testid="mc-procurement-page" className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/admin/mixed-container" className="text-xs text-zinc-500 hover:underline">← Request Inbox</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Procurement · {container.externalRef}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Status: {MC_STATE_LABELS[container.state] ?? container.state} · Categories: {data.categories.join(", ")}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {container.state === "MC_PRICING_REQUESTED" && (
          <Button data-testid="mc-start-procurement" onClick={() => void adminMixedContainerApi.startProcurement(id!).then(refresh)}>
            Start Procurement
          </Button>
        )}
        {container.state === "MC_REVISION_REQUESTED" && (
          <Button data-testid="mc-resume-procurement" onClick={() => void adminMixedContainerApi.resumeProcurement(id!).then(refresh)}>
            Resume Procurement
          </Button>
        )}
      </div>

      <section className="dmx-card p-5" data-testid="mc-procurement-summary">
        <h2 className="font-medium mb-3">Container Summary</h2>
        <p className="text-sm text-zinc-600">{container.currentPalletCount} pallets · {container.productCount} products</p>
        {data.buyerNotes && <p className="text-sm mt-2">Buyer notes: {data.buyerNotes}</p>}
      </section>

      <section className="dmx-card p-5 overflow-x-auto" data-testid="mc-procurement-pricing">
        <h2 className="font-medium mb-3">Manual Pricing Entry (Operations Only)</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left pb-2">Product</th>
              <th className="text-left pb-2">Pallets</th>
              <th className="text-left pb-2">Supplier Code</th>
              <th className="text-left pb-2">EXW / pallet</th>
              <th className="text-left pb-2">Notes</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {container.lines.map((line) => {
              const existing = quoteMap.get(line.id);
              const form = quoteForms[line.id] ?? {
                supplierCode: existing?.supplierCode ?? "SUP-001",
                exwPrice: String(existing?.exwPrice ?? line.indicativeUnitMid ?? 1000),
                notes: existing?.notes ?? "",
              };
              return (
                <tr key={line.id} data-testid={`mc-proc-line-${line.productRef}`} className="border-t border-zinc-100">
                  <td className="py-3">{line.name}</td>
                  <td className="py-3">{line.palletCount}</td>
                  <td className="py-3">
                    <input
                      className="h-8 px-2 border rounded text-sm w-28"
                      value={form.supplierCode}
                      data-testid={`mc-supplier-code-${line.productRef}`}
                      onChange={(e) => setQuoteForms((f) => ({ ...f, [line.id]: { ...form, supplierCode: e.target.value } }))}
                    />
                  </td>
                  <td className="py-3">
                    <input
                      className="h-8 px-2 border rounded text-sm w-24"
                      value={form.exwPrice}
                      data-testid={`mc-exw-price-${line.productRef}`}
                      onChange={(e) => setQuoteForms((f) => ({ ...f, [line.id]: { ...form, exwPrice: e.target.value } }))}
                    />
                  </td>
                  <td className="py-3">
                    <input
                      className="h-8 px-2 border rounded text-sm w-40"
                      value={form.notes}
                      onChange={(e) => setQuoteForms((f) => ({ ...f, [line.id]: { ...form, notes: e.target.value } }))}
                    />
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      className="text-accent-900 text-xs font-medium"
                      data-testid={`mc-save-quote-${line.productRef}`}
                      onClick={() => void saveQuote(line.id)}
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

      <section className="dmx-card p-5 space-y-3" data-testid="mc-offer-builder">
        <h2 className="font-medium">Create Container Offer</h2>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">Export fee <input className="ml-2 h-8 px-2 border rounded w-24" value={fee} onChange={(e) => setFee(e.target.value)} data-testid="mc-offer-fee" /></label>
          <label className="text-sm">Est. freight <input className="ml-2 h-8 px-2 border rounded w-24" value={freight} onChange={(e) => setFreight(e.target.value)} data-testid="mc-offer-freight" /></label>
        </div>
        <textarea
          className="w-full border rounded-lg p-2 text-sm"
          placeholder="Offer notes (visible to buyer)"
          value={offerNotes}
          onChange={(e) => setOfferNotes(e.target.value)}
          data-testid="mc-offer-notes"
        />
        <div className="flex gap-2">
          <Button
            data-testid="mc-create-offer"
            disabled={!["MC_PROCUREMENT_IN_PROGRESS", "MC_REVISION_REQUESTED", "MC_EXPIRED"].includes(container.state)}
            onClick={() =>
              void adminMixedContainerApi
                .createOffer(id!, {
                  exportExecutionFee: Number(fee),
                  estimatedFreight: Number(freight),
                  offerNotes: offerNotes || undefined,
                  validityHours: 72,
                })
                .then(refresh)
            }
          >
            Create Offer
          </Button>
          {latestDraft && (
            <Button
              data-testid="mc-send-offer"
              onClick={() => void adminMixedContainerApi.sendOffer(id!, latestDraft.id).then(refresh)}
            >
              Send to Buyer
            </Button>
          )}
        </div>
        {offers[0] && (
          <p className="text-xs text-zinc-500">Latest offer v{offers[0].version} — {offers[0].status} · Valid until {offers[0].validityDate ? new Date(offers[0].validityDate).toLocaleString() : "—"}</p>
        )}
      </section>
    </div>
  );
}
