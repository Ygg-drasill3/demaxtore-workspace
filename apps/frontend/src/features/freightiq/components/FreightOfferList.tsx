import type { FreightOffer, FreightSummary } from "@dmx/contracts/freightiq";
import { FreightOfferListCard, type OfferHighlight } from "./FreightOfferListCard";
import { useT } from "@/i18n/useT";

interface Props {
  summary: FreightSummary;
  pol: string;
  pod: string;
  canSelect: boolean;
  onRequestSelect: (offerId: string) => void;
  busy?: boolean;
}

function highlightFor(offer: FreightOffer, summary: FreightSummary): OfferHighlight {
  const h = summary.comparisonHints;
  if (h.lowestPriceOfferId === offer.id) return "best_price";
  if (h.fastestTransitOfferId === offer.id) return "fastest";
  if (h.earliestEtdOfferId === offer.id) return "earliest_etd";
  if (h.closestCutOffOfferId === offer.id) return "cutoff_soon";
  return null;
}

export function FreightOfferList({ summary, pol, pod, canSelect, onRequestSelect, busy }: Props) {
  const { t } = useT();
  const offers = summary.offers
    .filter((o) => ["ACTIVE", "REVISED", "SELECTED"].includes(o.status))
    .sort((a, b) => a.price - b.price);
  const selectedId = summary.selection?.offerId;

  if (!offers.length) return null;

  return (
    <section data-testid="freightiq-offer-list" data-guide="freight-comparison" className="space-y-3">
      <div>
        <span className="dmx-eyebrow text-zinc-500">{t("order.freightiq.offerListEyebrow")}</span>
        <h3 className="font-display text-lg font-semibold mt-0.5">{t("order.freightiq.offerListTitle")}</h3>
        <p className="text-sm text-zinc-500 mt-1">{t("order.freightiq.offerListHint")}</p>
      </div>

      <div className="space-y-4">
        {offers.map((o) => (
          <FreightOfferListCard
            key={o.id}
            offer={o}
            pol={pol}
            pod={pod}
            highlight={highlightFor(o, summary)}
            selected={selectedId === o.id}
            canSelect={canSelect && !selectedId}
            onRequestSelect={onRequestSelect}
            busy={busy}
          />
        ))}
      </div>
    </section>
  );
}
