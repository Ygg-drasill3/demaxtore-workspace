import { INCOTERM_VALUES } from "@dmx/contracts/rfq.zod";
import type { DirectPoWizardState } from "../../lib/direct-po-wizard.types";
import type { FieldErrors } from "../../lib/direct-po-wizard.utils";

const CURRENCIES = ["USD", "EUR", "GBP"] as const;

interface Props {
  state: DirectPoWizardState;
  errors: FieldErrors;
  onChange: (patch: Partial<DirectPoWizardState>) => void;
}

export function CommercialTermsStep({ state, errors, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="direct-po-commercial-step">
      <fieldset className="sm:col-span-2 space-y-2">
        <legend className="text-xs font-semibold text-zinc-600">PO number</legend>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="poNumberMode"
              checked={state.poNumberMode === "AUTO"}
              onChange={() => onChange({ poNumberMode: "AUTO", poNumber: "" })}
            />
            Auto-generated
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="poNumberMode"
              checked={state.poNumberMode === "CUSTOM"}
              onChange={() => onChange({ poNumberMode: "CUSTOM" })}
            />
            Custom
          </label>
        </div>
        {state.poNumberMode === "CUSTOM" && (
          <label className="block text-xs text-zinc-600 max-w-md">
            PO number
            <input
              className="dmx-input mt-1"
              value={state.poNumber}
              onChange={(e) => onChange({ poNumber: e.target.value })}
              aria-invalid={!!errors.poNumber}
            />
            {errors.poNumber && <span className="mt-1 block text-red-600" role="alert">{errors.poNumber}</span>}
          </label>
        )}
      </fieldset>

      <label className="block text-xs text-zinc-600">
        Currency
        <select
          className="dmx-input mt-1"
          value={state.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
          aria-invalid={!!errors.currency}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.currency && <span className="mt-1 block text-red-600" role="alert">{errors.currency}</span>}
      </label>

      <label className="block text-xs text-zinc-600">
        Incoterm
        <select
          className="dmx-input mt-1"
          value={state.incoterm}
          onChange={(e) => onChange({ incoterm: e.target.value })}
          data-testid="direct-po-incoterm"
        >
          {INCOTERM_VALUES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-zinc-600 sm:col-span-2">
        Payment terms
        <textarea className="dmx-input mt-1 min-h-[72px]" value={state.paymentTerms} onChange={(e) => onChange({ paymentTerms: e.target.value })} />
      </label>

      <label className="block text-xs text-zinc-600 sm:col-span-2">
        Delivery terms
        <textarea className="dmx-input mt-1 min-h-[72px]" value={state.deliveryTerms} onChange={(e) => onChange({ deliveryTerms: e.target.value })} />
      </label>

      <label className="block text-xs text-zinc-600">
        Expected delivery date
        <input type="date" className="dmx-input mt-1" value={state.expectedDeliveryDate} onChange={(e) => onChange({ expectedDeliveryDate: e.target.value })} />
      </label>

      <label className="block text-xs text-zinc-600">
        Destination country
        <input
          className="dmx-input mt-1"
          maxLength={100}
          value={state.destinationCountry}
          onChange={(e) => onChange({ destinationCountry: e.target.value })}
          placeholder="e.g. Turkey"
          aria-invalid={!!errors.destinationCountry}
        />
        {errors.destinationCountry && <span className="mt-1 block text-red-600" role="alert">{errors.destinationCountry}</span>}
      </label>

      <label className="block text-xs text-zinc-600">
        Destination port
        <input className="dmx-input mt-1" value={state.destinationPort} onChange={(e) => onChange({ destinationPort: e.target.value })} />
      </label>

      <label className="block text-xs text-zinc-600">
        Buyer reference
        <input className="dmx-input mt-1" value={state.buyerReference} onChange={(e) => onChange({ buyerReference: e.target.value })} />
      </label>

      <label className="block text-xs text-zinc-600 sm:col-span-2">
        Notes
        <textarea className="dmx-input mt-1 min-h-[96px]" value={state.notes} onChange={(e) => onChange({ notes: e.target.value })} />
      </label>
    </div>
  );
}
