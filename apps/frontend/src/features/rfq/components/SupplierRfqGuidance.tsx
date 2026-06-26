// Supplier-only banners when the quote form is hidden or the user is not assigned.
import { AlertCircle, FileText } from "lucide-react";
import type { RfqState } from "@dmx/contracts/rfq.fsm";

interface Props {
  state:               RfqState;
  isCounterparty:      boolean;
  isSelectedSupplier?: boolean;
}

export function SupplierRfqGuidance({ state, isCounterparty, isSelectedSupplier }: Props) {
  if (!isCounterparty) {
    return (
      <div
        data-testid="supplier-not-assigned-banner"
        className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3"
      >
        <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-medium">You are not assigned to quote on this RFQ</p>
          <p className="mt-1 text-amber-800/90">
            Only suppliers invited by DeMaxtore (Counterparty) can submit a quotation. Contact operations if you expected an invite.
          </p>
        </div>
      </div>
    );
  }

  if (state === "PROFORMA_REQUESTED" && isSelectedSupplier) {
    return (
      <div
        data-testid="supplier-proforma-banner"
        className="rounded-xl border border-accent-900/20 bg-accent-50 px-5 py-4 flex gap-3"
      >
        <FileText className="h-5 w-5 text-accent-900 shrink-0 mt-0.5" />
        <div className="text-sm text-ink-900">
          <p className="font-medium">Proforma requested — action required</p>
          <p className="mt-1 text-zinc-700">
            Use the <strong>Send proforma invoice</strong> form below — pick your PDF and tap send. That is
            all you need; the Documents panel is optional.
          </p>
        </div>
      </div>
    );
  }

  if (state === "SUPPLIERS_ASSIGNED") {
    return (
      <div
        data-testid="supplier-awaiting-publish-banner"
        className="rounded-xl border border-accent-900/20 bg-accent-50 px-5 py-4 flex gap-3"
      >
        <FileText className="h-5 w-5 text-accent-900 shrink-0 mt-0.5" />
        <div className="text-sm text-ink-900">
          <p className="font-medium">Invited — waiting for RFQ to open</p>
          <p className="mt-1 text-zinc-700">
            Admin must <strong>Publish RFQ</strong> before you can submit prices. After status becomes{" "}
            <span className="font-mono text-xs bg-white/80 px-1 rounded">RFQ_OPEN</span>, the{" "}
            <strong>Submit your quotation</strong> form appears on this page.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
