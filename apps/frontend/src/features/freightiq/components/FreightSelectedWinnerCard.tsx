import type { FreightOffer } from "@dmx/contracts/freightiq";
import { Link } from "react-router-dom";
import { CheckCircle2, Ship } from "lucide-react";
import { useT } from "@/i18n/useT";

interface Props {
  offer: FreightOffer;
  shipmentUrl?: string | null;
  estimatedCif?: string | null;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function FreightSelectedWinnerCard({ offer, shipmentUrl, estimatedCif }: Props) {
  const { t } = useT();
  const vesselLabel = offer.vesselName?.trim() || t("order.freightiq.vesselTbc");

  return (
    <section data-testid="freightiq-selected-winner" className="dmx-card p-5 border-emerald-200 bg-emerald-50/40">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center shrink-0">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="dmx-eyebrow text-emerald-800">{t("order.freightiq.selectedWinnerEyebrow")}</span>
          <h3 className="font-display text-lg font-semibold mt-0.5 text-emerald-950">{vesselLabel}</h3>
          <p className="text-sm text-emerald-900/80 mt-1">
            {offer.carrierName} · {offer.providerName} · {offer.price.toLocaleString()} {offer.currency}
          </p>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><dt className="text-emerald-800/70">ETD</dt><dd className="font-medium">{fmtDate(offer.etd)}</dd></div>
            <div><dt className="text-emerald-800/70">ETA</dt><dd className="font-medium">{fmtDate(offer.eta)}</dd></div>
            <div><dt className="text-emerald-800/70">{t("order.freightiq.transit")}</dt><dd className="font-medium">{offer.transitDays}d</dd></div>
            {estimatedCif && (
              <div><dt className="text-emerald-800/70">Est. CIF</dt><dd className="font-medium">{estimatedCif}</dd></div>
            )}
          </dl>
          {shipmentUrl && shipmentUrl !== "#" && (
            <Link
              to={shipmentUrl}
              data-testid="freightiq-open-shipment"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-emerald-900 hover:underline"
            >
              <Ship className="h-4 w-4" />
              {t("order.freightiq.openShipment")} →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
