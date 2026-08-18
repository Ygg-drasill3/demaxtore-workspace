import { useState } from "react";
import { Link } from "react-router-dom";
import type { ContainerOfferDTO } from "@dmx/contracts/mixed-container.zod";
import { PROCUREMENT_STATUS_LABELS } from "@dmx/contracts/mixed-container-procurement";
import { Button } from "@/components/ui/Button";

function fmtMoney(n: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function formatCountdown(seconds: number | null) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m remaining`;
}

type Props = {
  offer: ContainerOfferDTO;
  workspaceId: string;
  onApprove?: () => Promise<void>;
  onRequestRevision?: (data: { revisionType: string; comment: string }) => Promise<void>;
  onSelectVersion?: (offerId: string) => void;
  submitting?: boolean;
  embedded?: boolean;
};

export function CommercialProposalPanel({
  offer,
  workspaceId,
  onApprove,
  onRequestRevision,
  onSelectVersion,
  submitting = false,
  embedded = false,
}: Props) {
  const [revisionComment, setRevisionComment] = useState("");
  const [revisionType, setRevisionType] = useState("GENERAL");

  const expired = offer.expiresInSeconds === 0 || offer.state === "MC_EXPIRED";
  const canAct = offer.status === "SENT" && !expired && offer.state === "MC_BUYER_REVIEW";
  const isReadOnly = !canAct;
  const statusLabel = PROCUREMENT_STATUS_LABELS[offer.procurementStatus as keyof typeof PROCUREMENT_STATUS_LABELS] ?? offer.procurementStatus;
  const organizationStarted = ["MC_EXECUTION_READY", "MC_EXECUTION_ACTIVE", "MC_EXECUTION_COMPLETE"].includes(offer.state);

  return (
    <div data-testid="mc-commercial-proposal" className="space-y-6">
      <header className="dmx-card p-5" data-testid="mc-proposal-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Commercial Proposal</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight mt-1" data-testid="mc-proposal-ref">
              {offer.proposalRef ?? "—"}
            </h2>
            <p className="text-sm text-zinc-600 mt-1">Version {offer.version}</p>
          </div>
          <div className="text-right">
            <span className="inline-block text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-accent-50 text-accent-900 border border-accent-100" data-testid="mc-proposal-status">
              {statusLabel}
            </span>
            {offer.proposalDate && (
              <p className="text-xs text-zinc-500 mt-2">Proposal date {new Date(offer.proposalDate).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </header>

      {organizationStarted && (
        <div data-testid="mc-proposal-approved" className="dmx-card p-5 bg-green-50 border-green-200">
          <h3 className="font-medium text-green-900">Commercial proposal approved</h3>
          <p className="text-sm text-green-800 mt-1">Organization has started for this procurement request.</p>
          {!embedded && (
            <Link to={`/buyer/mixed-container/organization/${workspaceId}`} className="inline-block mt-3">
              <Button size="sm" variant="secondary" data-testid="mc-view-execution">View Organization</Button>
            </Link>
          )}
        </div>
      )}

      {offer.state === "MC_REVISION_REQUESTED" && (
        <div data-testid="mc-revision-submitted" className="dmx-card p-5 bg-amber-50 border-amber-200">
          <h3 className="font-medium text-amber-900">Revision requested</h3>
          <p className="text-sm text-amber-800 mt-1">Your revision has been sent to the procurement team. The current proposal remains archived.</p>
        </div>
      )}

      {offer.status === "SENT" && (
        <div className="dmx-card p-5 flex flex-wrap justify-between gap-3" data-testid="mc-offer-expiry">
          <div>
            <p className="text-xs uppercase text-zinc-500">Proposal validity</p>
            <p className="text-lg font-medium mt-1" data-testid="mc-offer-countdown">
              {expired ? "Expired" : formatCountdown(offer.expiresInSeconds)}
            </p>
          </div>
          {canAct && onApprove && (
            <Button data-testid="mc-approve-offer" disabled={submitting} onClick={() => void onApprove()}>
              Approve Proposal
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 dmx-card p-5 overflow-x-auto" data-testid="mc-offer-lines">
          <h3 className="font-medium mb-4">Products</h3>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Brand</th>
                <th className="text-left pb-2">Packaging</th>
                <th className="text-left pb-2">Quantity</th>
                <th className="text-right pb-2">EXW Unit Price</th>
                <th className="text-right pb-2">EXW Total</th>
              </tr>
            </thead>
            <tbody>
              {offer.lines.map((line) => (
                <tr key={line.id} data-testid={`mc-offer-line-${line.productRef}`} className="border-t border-zinc-100">
                  <td className="py-3 font-medium">{line.productName}</td>
                  <td className="py-3 text-zinc-600">{line.brand ?? "—"}</td>
                  <td className="py-3 text-zinc-600">{line.packaging}</td>
                  <td className="py-3">{line.quantity}</td>
                  <td className="py-3 text-right">{fmtMoney(line.unitPrice, offer.currency)}</td>
                  <td className="py-3 text-right">{fmtMoney(line.lineTotal, offer.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dmx-card p-5 space-y-3" data-testid="mc-offer-totals">
          <h3 className="font-medium">Commercial Summary</h3>
          <div className="flex justify-between text-sm">
            <span>Total Products EXW</span>
            <span data-testid="mc-offer-subtotal">{fmtMoney(offer.productSubtotal, offer.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Logistics Cost</span>
            <span data-testid="mc-offer-logistics">{fmtMoney(offer.logisticsCost, offer.currency)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Estimated Total Cost</span>
            <span data-testid="mc-offer-total">{fmtMoney(offer.estimatedTotalCost, offer.currency)}</span>
          </div>
          {offer.offerNotes && <p className="text-sm text-zinc-600 pt-2">{offer.offerNotes}</p>}
        </div>
      </div>

      {offer.buyerRevisionNotes && offer.buyerRevisionNotes.length > 0 && (
        <section className="dmx-card p-5" data-testid="mc-buyer-notes">
          <h3 className="font-medium mb-3">Buyer Notes</h3>
          <ul className="space-y-3">
            {offer.buyerRevisionNotes.map((note) => (
              <li key={note.id} className="text-sm border-t border-zinc-100 pt-3 first:border-0 first:pt-0">
                <p className="text-zinc-800">{note.comment}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Version {note.offerVersion} · {new Date(note.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {offer.versions && offer.versions.length > 1 && (
        <section className="dmx-card p-5" data-testid="mc-proposal-history">
          <h3 className="font-medium mb-3">Proposal History</h3>
          <ol className="space-y-2">
            {offer.versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between text-sm border-t border-zinc-100 pt-2 first:border-0 first:pt-0">
                <span>
                  Commercial Proposal V{v.version}
                  {v.approvedAt ? " · Approved" : ""}
                  {v.isActive ? " · Current" : ""}
                </span>
                {onSelectVersion && v.id !== offer.id ? (
                  <button
                    type="button"
                    className="text-accent-900 text-xs font-medium"
                    data-testid={`mc-view-proposal-v${v.version}`}
                    onClick={() => onSelectVersion(v.id)}
                  >
                    View (read-only)
                  </button>
                ) : (
                  <span className="text-xs text-zinc-400">{isReadOnly || v.id !== offer.id ? "Read-only" : "Active"}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {canAct && onRequestRevision && (
        <section className="dmx-card p-5 space-y-3" data-testid="mc-revision-form">
          <h3 className="font-medium">Request Revision</h3>
          <p className="text-sm text-zinc-500">Describe changes needed. Optional comments are recorded as buyer notes.</p>
          <select
            className="h-9 px-2 border rounded text-sm"
            value={revisionType}
            onChange={(e) => setRevisionType(e.target.value)}
            data-testid="mc-revision-type"
          >
            <option value="GENERAL">General comment</option>
            <option value="REMOVE_PRODUCT">Remove product</option>
            <option value="REDUCE_PALLETS">Change quantity</option>
            <option value="REPLACE_PRODUCT">Replace brand or product</option>
          </select>
          <textarea
            className="w-full border rounded-lg p-2 text-sm"
            rows={3}
            placeholder="e.g. Please remove Olive Oil. Increase Pasta to 12 pallets."
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            data-testid="mc-revision-comment"
          />
          <Button
            variant="secondary"
            data-testid="mc-request-revision"
            disabled={submitting || revisionComment.length < 3}
            onClick={() => void onRequestRevision({ revisionType, comment: revisionComment })}
          >
            Request Revision
          </Button>
        </section>
      )}
    </div>
  );
}
