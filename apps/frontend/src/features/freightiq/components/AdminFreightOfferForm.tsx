import { useMemo, useState } from "react";
import {
  emptyAdminOfferForm,
  type AdminOfferFormValues,
  validateAdminOfferForm,
} from "../lib/freight-offer-submit";
import { useT } from "@/i18n/useT";

interface Props {
  busy?: boolean;
  error?: string | null;
  onSubmit: (form: AdminOfferFormValues) => void;
  onCancel: () => void;
  initial?: Partial<AdminOfferFormValues>;
}

export function AdminFreightOfferForm({ busy, error, onSubmit, onCancel, initial }: Props) {
  const { t } = useT();
  const [form, setForm] = useState<AdminOfferFormValues>(() => emptyAdminOfferForm(initial));
  const [localError, setLocalError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !busy && !validateAdminOfferForm(form);
  }, [busy, form]);

  const set = <K extends keyof AdminOfferFormValues>(key: K, value: AdminOfferFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (localError) setLocalError(null);
  };

  const handleSubmit = () => {
    const validationError = validateAdminOfferForm(form);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    onSubmit(form);
  };

  return (
    <section
      data-testid="freightiq-admin-offer-form"
      className="dmx-card p-4 space-y-4 border border-accent-200 bg-paper-50/70"
    >
      <div>
        <h4 className="font-display text-base font-semibold">
          {t("order.freightiq.submitOfferTitle", "Submit Freight Offer")}
        </h4>
        <p className="text-sm text-zinc-500 mt-1">
          {t(
            "order.freightiq.submitOfferHint",
            "Enter a forwarder quote so the buyer can compare and select a sailing.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs text-zinc-600">
          {t("order.freightiq.forwarder", "Forwarder")}
          <input
            data-testid="freightiq-offer-provider"
            className="dmx-input mt-1"
            value={form.providerName}
            onChange={(e) => set("providerName", e.target.value)}
            placeholder="e.g. Agemar Global"
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          {t("order.freightiq.carrier", "Carrier")}
          <input
            data-testid="freightiq-offer-carrier"
            className="dmx-input mt-1"
            value={form.carrierName}
            onChange={(e) => set("carrierName", e.target.value)}
            placeholder="e.g. COSCO"
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          {t("order.freightiq.freightPrice", "Freight price")}
          <input
            data-testid="freightiq-offer-price"
            type="number"
            min="1"
            step="1"
            className="dmx-input mt-1"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          Currency
          <select
            data-testid="freightiq-offer-currency"
            className="dmx-input mt-1"
            value={form.currency}
            onChange={(e) => set("currency", e.target.value as AdminOfferFormValues["currency"])}
            disabled={busy}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </label>
        <label className="block text-xs text-zinc-600">
          Transit days
          <input
            data-testid="freightiq-offer-transit"
            type="number"
            min="1"
            max="365"
            className="dmx-input mt-1"
            value={form.transitDays}
            onChange={(e) => set("transitDays", e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          {t("order.freightiq.validUntil", "Valid until")}
          <input
            data-testid="freightiq-offer-valid-until"
            type="date"
            className="dmx-input mt-1"
            value={form.validUntil}
            onChange={(e) => set("validUntil", e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          {t("order.freightiq.vessel", "Vessel")}
          <input
            data-testid="freightiq-offer-vessel"
            className="dmx-input mt-1"
            value={form.vesselName}
            onChange={(e) => set("vesselName", e.target.value)}
            placeholder="Optional"
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          ETD
          <input
            data-testid="freightiq-offer-etd"
            type="date"
            className="dmx-input mt-1"
            value={form.etd}
            onChange={(e) => set("etd", e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          ETA
          <input
            data-testid="freightiq-offer-eta"
            type="date"
            className="dmx-input mt-1"
            value={form.eta}
            onChange={(e) => set("eta", e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          {t("order.freightiq.cutoff", "Cut-off")}
          <input
            data-testid="freightiq-offer-cutoff"
            type="date"
            className="dmx-input mt-1"
            value={form.cutOff}
            onChange={(e) => set("cutOff", e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="block text-xs text-zinc-600 sm:col-span-2">
          Remarks
          <textarea
            data-testid="freightiq-offer-remarks"
            className="dmx-input mt-1 min-h-[72px]"
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            disabled={busy}
          />
        </label>
      </div>

      {(localError || error) && (
        <p data-testid="freightiq-offer-form-error" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
          {localError || error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          data-testid="freightiq-offer-cancel"
          className="dmx-btn-secondary text-sm"
          onClick={onCancel}
          disabled={busy}
        >
          {t("order.freightiq.cancelSelection", "Cancel")}
        </button>
        <button
          type="button"
          data-testid="freightiq-offer-submit"
          className="dmx-btn-primary text-sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {busy
            ? t("common.loading", "Submitting…")
            : t("order.freightiq.submitOffer", "Submit Freight Offer")}
        </button>
      </div>
    </section>
  );
}
