import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkContainerApi } from "../lib/bulk-container.api";
import { EstimatedCifPanel } from "@/features/freight-estimate/components/EstimatedCifPanel";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/toast.store";

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatCountdown(seconds: number | null) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  if (h >= 72) return "72h remaining";
  if (h >= 48) return "48h remaining";
  if (h >= 24) return "24h remaining";
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m remaining`;
}

export default function BulkContainerOfferPage() {
  const { id: offerId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [revisionMessage, setRevisionMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: offer, isLoading } = useQuery({
    queryKey: ["bc-offer", offerId],
    queryFn: () => bulkContainerApi.getOffer(offerId!),
    enabled: !!offerId,
    refetchInterval: 60_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["bc-offer", offerId] });

  const approve = async () => {
    setSubmitting(true);
    try {
      await bulkContainerApi.approveOffer(offerId!);
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
      await bulkContainerApi.requestRevision(offerId!, revisionMessage);
      toast.success("Revision requested");
      await refresh();
    } catch {
      toast.error("Could not submit revision");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !offer) {
    return <div data-testid="bc-offer-loading" className="p-8 animate-pulse">Loading…</div>;
  }

  const expired = offer.expiresInSeconds === 0 || offer.state === "BC_EXPIRED";
  const canAct = offer.status === "SENT" && !expired && offer.state === "BC_BUYER_REVIEW";

  return (
    <div data-testid="bc-offer-page" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/buyer/bulk-container/requests" className="text-xs text-zinc-500 hover:underline">← My Bulk Containers</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Bulk Offer · {offer.externalRef}</h1>
        <p className="text-sm text-zinc-500 mt-1">{offer.offerReference} — consolidated procurement offer from DeMaxtore.</p>
      </header>

      {offer.state === "BC_APPROVED" && (
        <div data-testid="bc-offer-approved" className="dmx-card p-5 bg-green-50 border-green-200">
          <h2 className="font-medium text-green-900">Offer approved</h2>
          <p className="text-sm text-green-800 mt-1">Your bulk container offer has been approved. Allocation and payment coordination follows in a future sprint.</p>
        </div>
      )}

      {offer.state === "BC_REVISION_REQUESTED" && (
        <div data-testid="bc-revision-submitted" className="dmx-card p-5 bg-amber-50 border-amber-200">
          <h2 className="font-medium text-amber-900">Revision requested</h2>
          <p className="text-sm text-amber-800 mt-1">Your revision has been sent to the procurement team.</p>
        </div>
      )}

      {expired && (
        <div data-testid="bc-offer-expired" className="dmx-card p-5 bg-zinc-50 border-zinc-200">
          <h2 className="font-medium">Offer expired</h2>
          <p className="text-sm text-zinc-600 mt-1">This offer is read-only. Contact operations for a refreshed quote.</p>
        </div>
      )}

      <div className="dmx-card p-5 flex flex-wrap justify-between gap-3" data-testid="bc-offer-expiry">
        <div>
          <p className="text-xs uppercase text-zinc-500">Offer validity (72 hours)</p>
          <p className="text-lg font-medium mt-1" data-testid="bc-offer-countdown">
            {expired ? "Expired" : formatCountdown(offer.expiresInSeconds)}
          </p>
          {offer.validUntil && (
            <p className="text-xs text-zinc-400 mt-1">Valid until {new Date(offer.validUntil).toLocaleString()}</p>
          )}
        </div>
        {canAct && (
          <Button data-testid="bc-approve-offer" disabled={submitting} onClick={() => void approve()}>Approve Offer</Button>
        )}
      </div>

      {offer.workspaceId && <EstimatedCifPanel tradeId={offer.workspaceId} compact />}

      <div className="dmx-card p-5 overflow-x-auto" data-testid="bc-offer-lines">
        <h2 className="font-medium mb-4">Line Pricing</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left pb-2">Product</th>
              <th className="text-left pb-2">Packing</th>
              <th className="text-left pb-2">Specification</th>
              <th className="text-left pb-2">MT</th>
              <th className="text-left pb-2">USD/MT</th>
              <th className="text-left pb-2">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {offer.lines.map((line) => (
              <tr key={line.id} className="border-t border-zinc-100">
                <td className="py-2">{line.productName}</td>
                <td className="py-2">{line.packingType}</td>
                <td className="py-2 text-xs text-zinc-500">{line.specificationSummary}</td>
                <td className="py-2">{line.quantityMt}</td>
                <td className="py-2">{fmtMoney(line.unitPrice)}</td>
                <td className="py-2 font-medium">{fmtMoney(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right text-lg font-display font-semibold mt-4" data-testid="bc-offer-total">
          Offer Total: {fmtMoney(offer.offerTotal)}
        </p>
      </div>

      {canAct && (
        <section className="dmx-card p-5 space-y-3" data-testid="bc-revision-form">
          <h2 className="font-medium">Request Revision</h2>
          <textarea
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="Describe changes — quantity, specification, packing, or product replacement"
            value={revisionMessage}
            onChange={(e) => setRevisionMessage(e.target.value)}
            data-testid="bc-revision-message"
          />
          <Button
            variant="secondary"
            data-testid="bc-request-revision"
            disabled={submitting || revisionMessage.length < 3}
            onClick={() => void requestRevision()}
          >
            Request Revision
          </Button>
        </section>
      )}
    </div>
  );
}
