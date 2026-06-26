import type { FreightOffer, FreightSummary } from "@dmx/contracts/freightiq";
import { ComparisonMatrix } from "@/features/workspace/components/ComparisonMatrix";
import { useT } from "@/i18n/useT";

interface Props {
  summary: FreightSummary;
  canSelect: boolean;
  onRequestSelect: (offerId: string) => void;
}

function badgesFor(offer: FreightOffer, summary: FreightSummary): string[] {
  const b: string[] = [];
  const h = summary.comparisonHints;
  if (h.lowestPriceOfferId === offer.id) b.push("Lowest");
  if (h.fastestTransitOfferId === offer.id) b.push("Fastest");
  if (h.earliestEtdOfferId === offer.id) b.push("Earliest ETD");
  if (h.closestCutOffOfferId === offer.id) b.push("Cut-off soon");
  if (h.expiringSoonOfferIds.includes(offer.id)) b.push("Expiring");
  return b;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function FreightOfferComparisonPanel({ summary, canSelect, onRequestSelect }: Props) {
  const { t } = useT();
  const offers = summary.offers.filter((o) => ["ACTIVE", "REVISED", "SELECTED"].includes(o.status));
  const selectedId = summary.selection?.offerId;

  if (!offers.length) return null;

  const rows = offers.map((o) => ({
    id: o.id,
    cells: {
      vessel: <span className="font-medium">{o.vesselName?.trim() || t("order.freightiq.vesselTbc")}</span>,
      provider: <span className="text-zinc-600">{o.providerName}</span>,
      carrier: <span className="text-zinc-600">{o.carrierName}</span>,
      price: <span className="font-semibold tabular-nums">{o.price.toLocaleString()} {o.currency}</span>,
      transit: <span className="tabular-nums">{o.transitDays}d</span>,
      schedule: (
        <span className="text-xs text-zinc-500">
          ETD {fmtDate(o.etd)} · ETA {fmtDate(o.eta)}
        </span>
      ),
    },
    badges: badgesFor(o, summary),
    selected: selectedId === o.id,
    highlight: badgesFor(o, summary).length > 0,
  }));

  return (
    <ComparisonMatrix
      testId="freightiq-offer-comparison"
      eyebrow={t("order.freightiq.compareEyebrow")}
      title={t("order.freightiq.compareTitle")}
      columns={[
        { key: "vessel", label: t("order.freightiq.vessel") },
        { key: "provider", label: t("order.freightiq.forwarder") },
        { key: "carrier", label: t("order.freightiq.carrier") },
        { key: "price", label: t("order.freightiq.freightPrice"), align: "right" },
        { key: "transit", label: t("order.freightiq.transit"), align: "right" },
        { key: "schedule", label: "ETD / ETA" },
      ]}
      rows={rows}
      onSelectRow={canSelect && !selectedId ? onRequestSelect : undefined}
      selectLabel={t("order.freightiq.selectOffer")}
    />
  );
}
