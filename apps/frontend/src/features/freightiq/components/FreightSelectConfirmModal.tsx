import type { FreightOffer, FreightSummary } from "@dmx/contracts/freightiq";
import { Ship } from "lucide-react";
import { useT } from "@/i18n/useT";

interface Props {
  offer: FreightOffer | null;
  summary?: FreightSummary;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function FreightSelectConfirmModal({ offer, summary, onConfirm, onCancel, busy }: Props) {
  const { t } = useT();
  if (!offer) return null;

  const cif = summary?.commercialSummary?.estimatedCifUsd;
  const vesselLabel = offer.vesselName?.trim() || t("order.freightiq.vesselTbc");

  return (
    <div data-testid="freightiq-select-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4">
      <div className="dmx-card max-w-lg w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-800 grid place-items-center shrink-0">
            <Ship className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-display text-lg font-semibold">{t("order.freightiq.confirmVesselTitle")}</h4>
            <p className="text-sm text-zinc-500 mt-1">{t("order.freightiq.confirmVesselHint")}</p>
          </div>
        </div>

        <dl className="text-sm space-y-2 rounded-lg bg-paper-50 p-4">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">{t("order.freightiq.vessel")}</dt>
            <dd className="font-semibold text-right">{vesselLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">{t("order.freightiq.carrier")}</dt>
            <dd className="font-medium text-right">{offer.carrierName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">{t("order.freightiq.forwarder")}</dt>
            <dd className="text-right">{offer.providerName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">{t("order.freightiq.freightPrice")}</dt>
            <dd className="font-semibold tabular-nums text-right">{offer.price.toLocaleString()} {offer.currency}</dd>
          </div>
          {cif != null && (
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Est. CIF</dt>
              <dd className="font-semibold tabular-nums text-right">{cif.toLocaleString()} USD</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">{t("order.freightiq.transit")}</dt>
            <dd className="text-right">{offer.transitDays} {t("order.freightiq.days")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">ETD</dt>
            <dd className="text-right">{fmtDate(offer.etd)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">ETA</dt>
            <dd className="text-right">{fmtDate(offer.eta)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Cut-off</dt>
            <dd className="text-right">{fmtDate(offer.cutOff)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">{t("order.freightiq.validUntil")}</dt>
            <dd className="text-right">{fmtDate(offer.validUntil)}</dd>
          </div>
        </dl>

        <div className="flex gap-2">
          <button
            type="button"
            data-testid="freightiq-confirm-selection"
            className="dmx-btn-primary flex-1"
            disabled={busy}
            onClick={onConfirm}
          >
            {t("order.freightiq.confirmSelection")}
          </button>
          <button type="button" className="dmx-btn-secondary" onClick={onCancel}>
            {t("order.freightiq.cancelSelection")}
          </button>
        </div>
      </div>
    </div>
  );
}
