import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useT } from "@/i18n/useT";
import { freightiqApi } from "../lib/freightiq.api";

export interface AdminOfferFormValues {
  providerName: string;
  carrierName: string;
  vesselName: string;
  price: string;
  currency: "USD" | "EUR" | "GBP";
  transitDays: string;
  etd: string;
  eta: string;
  cutOff: string;
  validUntil: string;
  remarks: string;
}

function defaultDates(transitDays: number) {
  const etd = new Date(Date.now() + 14 * 86400_000);
  const cutOff = new Date(etd.getTime() - 2 * 86400_000);
  const eta = new Date(etd.getTime() + transitDays * 86400_000);
  const validUntil = new Date(Date.now() + 21 * 86400_000);
  const toInput = (d: Date) => d.toISOString().slice(0, 10);
  return { etd: toInput(etd), eta: toInput(eta), cutOff: toInput(cutOff), validUntil: toInput(validUntil) };
}

const INITIAL = (): AdminOfferFormValues => {
  const dates = defaultDates(26);
  return {
    providerName: "",
    carrierName: "",
    vesselName: "",
    price: "",
    currency: "USD",
    transitDays: "26",
    remarks: "",
    ...dates,
  };
};

interface Props {
  pol: string;
  pod: string;
  onSubmit: (values: AdminOfferFormValues) => Promise<void>;
  busy?: boolean;
  defaultOpen?: boolean;
}

export function FreightAdminOfferForm({ pol, pod, onSubmit, busy, defaultOpen }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [form, setForm] = useState<AdminOfferFormValues>(INITIAL);

  const { data: forwarders } = useQuery({
    queryKey: ["forwarders", ""],
    queryFn: () => freightiqApi.listForwarders(),
    enabled: open,
  });

  const { data: shippers } = useQuery({
    queryKey: ["freight-shippers", ""],
    queryFn: () => freightiqApi.listShippers(),
    enabled: open,
  });

  const set = (k: keyof AdminOfferFormValues, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleTransitChange = (days: string) => {
    setForm((f) => {
      const next = { ...f, transitDays: days };
      const n = Number(days);
      if (f.etd && Number.isFinite(n) && n > 0) {
        const etd = new Date(f.etd);
        next.eta = new Date(etd.getTime() + n * 86400_000).toISOString().slice(0, 10);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    await onSubmit(form);
    setForm(INITIAL());
    setOpen(false);
  };

  const valid =
    form.providerName.trim() &&
    form.carrierName.trim() &&
    form.vesselName.trim() &&
    Number(form.price) > 0 &&
    Number(form.transitDays) > 0 &&
    form.etd &&
    form.eta &&
    form.cutOff &&
    form.validUntil;

  return (
    <section data-testid="freightiq-admin-offer-form" className="dmx-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-paper-50"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-accent-900" />
          {t("order.freightiq.adminAddOffer")}
        </span>
        <span className="text-xs text-zinc-500">{pol} → {pod}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-paper-100 space-y-3 bg-paper-50/50">
          <p className="text-xs text-zinc-500">{t("order.freightiq.adminAddOfferHint")}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-zinc-600 sm:col-span-2">
              {t("freightiq.intake.pickForwarder")}
              <select
                className="dmx-input mt-1"
                data-testid="freightiq-admin-forwarder-pick"
                value=""
                onChange={(e) => {
                  const f = forwarders?.items?.find((x) => x.id === e.target.value);
                  if (f) set("providerName", f.companyName);
                }}
              >
                <option value="">{t("freightiq.intake.forwarderOptional")}</option>
                {(forwarders?.items ?? []).map((f) => (
                  <option key={f.id} value={f.id}>{f.companyName}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-600 sm:col-span-2">
              {t("freightiq.shippers.pickFromDirectory")}
              <select
                className="dmx-input mt-1"
                data-testid="freightiq-admin-shipper-pick"
                value=""
                onChange={(e) => {
                  const s = shippers?.items?.find((x) => x.id === e.target.value);
                  if (s) set("carrierName", s.name);
                }}
              >
                <option value="">{t("freightiq.shippers.pickOptional")}</option>
                {(shippers?.items ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.scacCode ? ` (${s.scacCode})` : ""}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-600 sm:col-span-2">
              {t("order.freightiq.carrier")} *
              <input className="dmx-input mt-1" placeholder="Yang Ming Line" value={form.carrierName} onChange={(e) => set("carrierName", e.target.value)} data-testid="freightiq-admin-carrier" />
            </label>
            <label className="block text-xs text-zinc-600">
              {t("order.freightiq.forwarder")} *
              <input className="dmx-input mt-1" placeholder="DeMaxtore Freight Desk" value={form.providerName} onChange={(e) => set("providerName", e.target.value)} data-testid="freightiq-admin-forwarder" />
            </label>
            <label className="block text-xs text-zinc-600">
              {t("order.freightiq.vessel")} *
              <input className="dmx-input mt-1" placeholder="YM Witness" value={form.vesselName} onChange={(e) => set("vesselName", e.target.value)} data-testid="freightiq-admin-vessel" />
            </label>
            <label className="block text-xs text-zinc-600">
              {t("order.freightiq.freightPrice")} *
              <input type="number" min="1" className="dmx-input mt-1" value={form.price} onChange={(e) => set("price", e.target.value)} data-testid="freightiq-admin-price" />
            </label>
            <label className="block text-xs text-zinc-600">
              {t("order.freightiq.transit")} (days) *
              <input type="number" min="1" className="dmx-input mt-1" value={form.transitDays} onChange={(e) => handleTransitChange(e.target.value)} data-testid="freightiq-admin-transit" />
            </label>
            <label className="block text-xs text-zinc-600">
              Currency
              <select className="dmx-input mt-1" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
            <label className="block text-xs text-zinc-600">
              ETD *
              <input type="date" className="dmx-input mt-1" value={form.etd} onChange={(e) => set("etd", e.target.value)} data-testid="freightiq-admin-etd" />
            </label>
            <label className="block text-xs text-zinc-600">
              ETA *
              <input type="date" className="dmx-input mt-1" value={form.eta} onChange={(e) => set("eta", e.target.value)} data-testid="freightiq-admin-eta" />
            </label>
            <label className="block text-xs text-zinc-600">
              {t("order.freightiq.cutoff")} *
              <input type="date" className="dmx-input mt-1" value={form.cutOff} onChange={(e) => set("cutOff", e.target.value)} data-testid="freightiq-admin-cutoff" />
            </label>
            <label className="block text-xs text-zinc-600">
              {t("order.freightiq.validUntil")} *
              <input type="date" className="dmx-input mt-1" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} data-testid="freightiq-admin-valid-until" />
            </label>
            <label className="block text-xs text-zinc-600 sm:col-span-2">
              Remarks
              <textarea className="dmx-input mt-1 min-h-[60px]" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              data-testid="freightiq-admin-submit-offer"
              className="dmx-btn-primary text-sm"
              disabled={!valid || busy}
              onClick={() => void handleSubmit()}
            >
              {t("order.freightiq.adminPublishOffer")}
            </button>
            <button type="button" className="dmx-btn-secondary text-sm" onClick={() => setOpen(false)}>
              {t("order.freightiq.cancelSelection")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
