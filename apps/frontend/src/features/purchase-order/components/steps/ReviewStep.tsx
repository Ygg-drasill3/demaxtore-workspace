import { computeSubtotal } from "../../lib/direct-po-wizard.utils";
import type { DirectPoWizardState } from "../../lib/direct-po-wizard.types";
import type { FieldErrors } from "../../lib/direct-po-wizard.utils";

interface Props {
  state: DirectPoWizardState;
  errors: FieldErrors;
}

export function ReviewStep({ state, errors }: Props) {
  const { subtotal, allPriced } = computeSubtotal(state.lines);
  const subtotalLabel = allPriced && subtotal != null
    ? `${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${state.currency}`
    : "Not specified";

  return (
    <div className="space-y-4" data-testid="direct-po-review-step">
      {errors.form && (
        <p className="text-sm text-red-600" role="alert">{errors.form}</p>
      )}

      <section className="dmx-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Supplier</h3>
        {state.supplier ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div><dt className="text-zinc-500 text-xs">Company</dt><dd>{state.supplier.companyName}</dd></div>
            <div><dt className="text-zinc-500 text-xs">Country</dt><dd>{state.supplier.countryName ?? state.supplier.countryCode ?? "—"}</dd></div>
            <div><dt className="text-zinc-500 text-xs">Contact</dt><dd>{state.supplier.primaryContactName ?? "—"}</dd></div>
            <div><dt className="text-zinc-500 text-xs">Email</dt><dd>{state.supplier.primaryContactEmail ?? "—"}</dd></div>
          </dl>
        ) : (
          <p className="text-sm text-red-600">No supplier selected</p>
        )}
      </section>

      <section className="dmx-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Commercial terms</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div><dt className="text-zinc-500 text-xs">PO number</dt><dd>{state.poNumberMode === "AUTO" ? "Auto-generated" : state.poNumber}</dd></div>
          <div><dt className="text-zinc-500 text-xs">Currency</dt><dd>{state.currency}</dd></div>
          <div><dt className="text-zinc-500 text-xs">Incoterm</dt><dd>{state.incoterm || "—"}</dd></div>
          <div><dt className="text-zinc-500 text-xs">Expected delivery</dt><dd>{state.expectedDeliveryDate || "—"}</dd></div>
          <div><dt className="text-zinc-500 text-xs">Destination</dt><dd>{[state.destinationCountry, state.destinationPort].filter(Boolean).join(" · ") || "—"}</dd></div>
          <div><dt className="text-zinc-500 text-xs">Buyer reference</dt><dd>{state.buyerReference || "—"}</dd></div>
        </dl>
        {state.paymentTerms && <p className="text-sm"><span className="text-zinc-500">Payment:</span> {state.paymentTerms}</p>}
        {state.deliveryTerms && <p className="text-sm"><span className="text-zinc-500">Delivery:</span> {state.deliveryTerms}</p>}
        {state.notes && <p className="text-sm"><span className="text-zinc-500">Notes:</span> {state.notes}</p>}
      </section>

      <section className="dmx-card p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Products</h3>
          <p className="text-xs text-zinc-500">{state.lines.length} lines · Subtotal {subtotalLabel}</p>
        </div>
        <ul className="divide-y divide-paper-100 text-sm">
          {state.lines.map((line, index) => (
            <li key={line.clientId} className="py-2 flex flex-col sm:flex-row sm:justify-between gap-1">
              <span>{line.productCode || line.description || `Line ${index + 1}`}</span>
              <span className="text-zinc-600 tabular-nums">
                {line.quantity || "—"} {line.unit}
                {line.unitPrice.trim() ? ` @ ${line.unitPrice} ${state.currency}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dmx-card p-4">
        <h3 className="text-sm font-semibold mb-2">Document</h3>
        <p className="text-sm text-zinc-600">
          {state.document.file?.name ?? state.document.documentFileName ?? "No document attached"}
        </p>
      </section>
    </div>
  );
}
