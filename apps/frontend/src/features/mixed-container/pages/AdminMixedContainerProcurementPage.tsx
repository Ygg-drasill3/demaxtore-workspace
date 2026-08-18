import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminMixedContainerApi } from "../lib/mixed-container.api";
import { Button } from "@/components/ui/Button";
import { ProcurementRequestDetailView } from "../components/ProcurementRequestDetailView";
import type { MixedContainerDTO } from "@dmx/contracts/mixed-container.zod";

type Quote = {
  id: string;
  containerLineId: string;
  productRef: string;
  productName: string;
  supplierCode: string;
  brand: string | null;
  exwPrice: number;
  currency: string;
  priceUnit: string;
  notes: string | null;
};

type Offer = {
  id: string;
  version: number;
  status: string;
  proposalRef: string | null;
  estimatedTotalCost: number;
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
  const [quoteForms, setQuoteForms] = useState<Record<string, { supplierCode: string; brand: string; exwPrice: string; notes: string }>>({});
  const [logisticsCost, setLogisticsCost] = useState("1700");
  const [offerNotes, setOfferNotes] = useState("");
  const [managerId, setManagerId] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mc-admin-procurement", id],
    queryFn: () => adminMixedContainerApi.get(id!) as Promise<ProcurementData>,
    enabled: !!id,
  });

  const { data: prDetail, refetch: refetchPr } = useQuery({
    queryKey: ["mc-admin-procurement-request", id],
    queryFn: () => adminMixedContainerApi.getProcurementRequest(id!),
    enabled: !!id,
  });

  const { data: managers } = useQuery({
    queryKey: ["mc-procurement-managers"],
    queryFn: () => adminMixedContainerApi.procurementManagers(),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["mc-admin-procurement", id] });
    void refetchPr();
  };

  if (isLoading || !data) {
    if (isError) {
      return (
        <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
          <p className="text-sm text-red-600">Could not load procurement workspace.</p>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
        </div>
      );
    }
    return <div data-testid="mc-procurement-loading" className="p-8 animate-pulse">Loading…</div>;
  }

  const { container, quotes, offers } = data;
  const latestDraft = offers.find((o) => o.status === "DRAFT");
  const quoteMap = new Map(quotes.map((q) => [q.containerLineId, q]));

  const saveQuote = async (lineId: string) => {
    const form = quoteForms[lineId] ?? { supplierCode: "SUP-001", brand: "", exwPrice: "1000", notes: "" };
    await adminMixedContainerApi.upsertQuote(id!, {
      containerLineId: lineId,
      supplierCode: form.supplierCode,
      brand: form.brand || undefined,
      exwPrice: Number(form.exwPrice),
      currency: container.currency,
      priceUnit: "PALLET",
      notes: form.notes || undefined,
    });
    await refresh();
  };

  return (
    <div data-testid="mc-procurement-page" className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <Link to="/admin/mixed-container" className="text-xs text-zinc-500 hover:underline">← Procurement Queue</Link>

      {prDetail && (
        <ProcurementRequestDetailView detail={prDetail} showInternalNotes>
          <div className="dmx-card p-5 space-y-4" data-testid="mc-admin-actions">
            <h2 className="font-medium">Procurement Actions</h2>
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
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-sm">
                <span className="text-xs uppercase text-zinc-500 block mb-1">Assign manager</span>
                <select
                  className="h-9 border rounded px-2 text-sm min-w-[200px]"
                  value={managerId || (prDetail.assignedManagerId ?? "")}
                  onChange={(e) => setManagerId(e.target.value)}
                  data-testid="mc-assign-manager-select"
                >
                  <option value="">Select manager</option>
                  {(managers?.items ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
              </label>
              <Button
                variant="secondary"
                data-testid="mc-assign-manager"
                disabled={!managerId}
                onClick={() => void adminMixedContainerApi.assignManager(id!, managerId).then(refresh)}
              >
                Assign
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm block">
                <span className="text-xs uppercase text-zinc-500 block mb-1">Internal note</span>
                <textarea
                  className="w-full min-h-[80px] border rounded p-2 text-sm"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  data-testid="mc-internal-note-input"
                />
              </label>
              <Button
                variant="secondary"
                data-testid="mc-add-internal-note"
                disabled={!internalNote.trim()}
                onClick={() => void adminMixedContainerApi.addInternalNote(id!, internalNote.trim()).then(() => {
                  setInternalNote("");
                  refresh();
                })}
              >
                Add Internal Note
              </Button>
            </div>
          </div>
        </ProcurementRequestDetailView>
      )}

      <p className="text-sm text-zinc-500">Categories: {data.categories.join(", ")}</p>

      <section className="dmx-card p-5 overflow-x-auto" data-testid="mc-procurement-pricing">
        <h2 className="font-medium mb-3">Manual Pricing Entry (Operations Only)</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left pb-2">Product</th>
              <th className="text-left pb-2">Pallets</th>
              <th className="text-left pb-2">Supplier Code</th>
              <th className="text-left pb-2">Brand</th>
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
                brand: existing?.brand ?? "",
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
                      className="h-8 px-2 border rounded text-sm w-28"
                      value={form.brand}
                      data-testid={`mc-brand-${line.productRef}`}
                      onChange={(e) => setQuoteForms((f) => ({ ...f, [line.id]: { ...form, brand: e.target.value } }))}
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
        <h2 className="font-medium">Commercial Proposal</h2>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            Logistics cost
            <input
              className="ml-2 h-8 px-2 border rounded w-24"
              value={logisticsCost}
              onChange={(e) => setLogisticsCost(e.target.value)}
              data-testid="mc-offer-logistics-cost"
            />
          </label>
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
                  logisticsCost: Number(logisticsCost),
                  offerNotes: offerNotes || undefined,
                  validityHours: 72,
                })
                .then(refresh)
            }
          >
            Create Proposal Draft
          </Button>
          {latestDraft && (
            <Button
              data-testid="mc-send-offer"
              onClick={() => void adminMixedContainerApi.sendOffer(id!, latestDraft.id).then(refresh)}
            >
              Publish to Buyer
            </Button>
          )}
        </div>
        {offers[0] && (
          <p className="text-xs text-zinc-500">
            {offers[0].proposalRef ? `${offers[0].proposalRef} · ` : ""}
            Version {offers[0].version} — {offers[0].status}
            {offers[0].validityDate ? ` · Valid until ${new Date(offers[0].validityDate).toLocaleString()}` : ""}
          </p>
        )}
      </section>
    </div>
  );
}
