import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mixedContainerApi } from "../lib/mixed-container.api";
import { EstimatedCifPanel } from "@/features/freight-estimate/components/EstimatedCifPanel";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/toast.store";

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatCountdown(seconds: number | null) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m remaining`;
}

export default function MixedContainerOfferPage() {
  const { id: offerId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [revisionComment, setRevisionComment] = useState("");
  const [revisionType, setRevisionType] = useState("GENERAL");
  const [submitting, setSubmitting] = useState(false);

  const { data: offer, isLoading } = useQuery({
    queryKey: ["mc-offer", offerId],
    queryFn: () => mixedContainerApi.getOffer(offerId!),
    enabled: !!offerId,
    refetchInterval: 60_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["mc-offer", offerId] });

  const approve = async () => {
    setSubmitting(true);
    try {
      await mixedContainerApi.approveOffer(offerId!);
      toast.success("Offer approved");
      await refresh();
    } catch {
      toast.error("Could not approve offer");
    } finally {
      setSubmitting(false);
    }
  };

  const requestRevision = async () => {
    setSubmitting(true);
    try {
      await mixedContainerApi.requestRevision(offerId!, { revisionType, comment: revisionComment });
      toast.success("Revision requested");
      await refresh();
    } catch {
      toast.error("Could not submit revision");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !offer) {
    return <div data-testid="mc-offer-loading" className="p-8 animate-pulse">Loading…</div>;
  }

  const expired = offer.expiresInSeconds === 0 || offer.state === "MC_EXPIRED";
  const canAct = offer.status === "SENT" && !expired && offer.state === "MC_BUYER_REVIEW";

  return (
    <div data-testid="mc-offer-page" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/buyer/mixed-container/requests" className="text-xs text-zinc-500 hover:underline">← My Containers</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Container Offer · {offer.externalRef}</h1>
        <p className="text-sm text-zinc-500 mt-1">Live supplier pricing — professional sourcing offer from DeMaxtore.</p>
      </header>

      {["MC_APPROVED", "MC_ALLOCATION_IN_PROGRESS", "MC_PROFORMA_PENDING", "MC_PAYMENT_TRACKING", "MC_EXECUTION_READY"].includes(offer.state) && (
        <div data-testid="mc-offer-approved" className="dmx-card p-5 bg-green-50 border-green-200">
          <h2 className="font-medium text-green-900">Offer approved</h2>
          <p className="text-sm text-green-800 mt-1">Your container offer has been approved. DeMaxtore is coordinating supplier allocations and payments.</p>
          <Link to={`/buyer/mixed-container/coordination/${offer.workspaceId}`} className="inline-block mt-3">
            <Button size="sm" variant="secondary" data-testid="mc-view-coordination">View Coordination</Button>
          </Link>
        </div>
      )}

      {offer.state === "MC_REVISION_REQUESTED" && (
        <div data-testid="mc-revision-submitted" className="dmx-card p-5 bg-amber-50 border-amber-200">
          <h2 className="font-medium text-amber-900">Revision requested</h2>
          <p className="text-sm text-amber-800 mt-1">Your revision has been sent to the procurement team.</p>
        </div>
      )}

      <div className="dmx-card p-5 flex flex-wrap justify-between gap-3" data-testid="mc-offer-expiry">
        <div>
          <p className="text-xs uppercase text-zinc-500">Offer validity (72 hours)</p>
          <p className="text-lg font-medium mt-1" data-testid="mc-offer-countdown">
            {expired ? "Expired" : formatCountdown(offer.expiresInSeconds)}
          </p>
          {offer.validityDate && (
            <p className="text-xs text-zinc-400 mt-1">Valid until {new Date(offer.validityDate).toLocaleString()}</p>
          )}
        </div>
        {canAct && (
          <div className="flex gap-2">
            <Button data-testid="mc-approve-offer" disabled={submitting} onClick={() => void approve()}>Approve Offer</Button>
          </div>
        )}
      </div>

      {offer.workspaceId && (
        <EstimatedCifPanel tradeId={offer.workspaceId} compact />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 dmx-card p-5 overflow-x-auto" data-testid="mc-offer-lines">
          <h2 className="font-medium mb-4">Product Pricing</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Packaging</th>
                <th className="text-left pb-2">Origin</th>
                <th className="text-left pb-2">Pallets</th>
                <th className="text-left pb-2">Unit price</th>
                <th className="text-left pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {offer.lines.map((line) => (
                <tr key={line.id} data-testid={`mc-offer-line-${line.productRef}`} className="border-t border-zinc-100">
                  <td className="py-3 font-medium">{line.productName}</td>
                  <td className="py-3 text-zinc-600">{line.packaging}</td>
                  <td className="py-3">{line.originCountry ?? "—"}</td>
                  <td className="py-3">{line.palletCount}</td>
                  <td className="py-3">{fmtMoney(line.unitPrice)}</td>
                  <td className="py-3">{fmtMoney(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-zinc-400 mt-3">Supplier identities are not disclosed — product, packaging, price, and origin only.</p>
        </div>

        <div className="dmx-card p-5 space-y-3" data-testid="mc-offer-totals">
          <h2 className="font-medium">Offer Total</h2>
          <div className="flex justify-between text-sm"><span>Products</span><span data-testid="mc-offer-subtotal">{fmtMoney(offer.productSubtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Export execution fee</span><span>{fmtMoney(offer.exportExecutionFee)}</span></div>
          <div className="flex justify-between text-sm"><span>Estimated freight</span><span>{fmtMoney(offer.estimatedFreight)}</span></div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Total</span>
            <span data-testid="mc-offer-total">{fmtMoney(offer.offerTotal)}</span>
          </div>
          {offer.offerNotes && <p className="text-sm text-zinc-600 pt-2">{offer.offerNotes}</p>}
        </div>
      </div>

      {canAct && (
        <section className="dmx-card p-5 space-y-3" data-testid="mc-revision-form">
          <h2 className="font-medium">Request Revision</h2>
          <select className="h-9 px-2 border rounded text-sm" value={revisionType} onChange={(e) => setRevisionType(e.target.value)} data-testid="mc-revision-type">
            <option value="GENERAL">General comment</option>
            <option value="REMOVE_PRODUCT">Remove product</option>
            <option value="REDUCE_PALLETS">Reduce pallets</option>
            <option value="REPLACE_PRODUCT">Replace product</option>
          </select>
          <textarea
            className="w-full border rounded-lg p-2 text-sm"
            rows={3}
            placeholder="Describe the change you need…"
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            data-testid="mc-revision-comment"
          />
          <Button variant="secondary" data-testid="mc-request-revision" disabled={submitting || revisionComment.length < 3} onClick={() => void requestRevision()}>
            Request Revision
          </Button>
        </section>
      )}
    </div>
  );
}
