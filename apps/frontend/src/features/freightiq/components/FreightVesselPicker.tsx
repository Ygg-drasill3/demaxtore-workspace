import type { FreightOffer, FreightSummary } from "@dmx/contracts/freightiq";
import { Anchor, Calendar, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";

interface Props {
  summary: FreightSummary;
  canSelect: boolean;
  onRequestSelect: (offerId: string) => void;
  busy?: boolean;
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
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function FreightVesselPicker({ summary, canSelect, onRequestSelect, busy }: Props) {
  const { t } = useT();
  const offers = summary.offers.filter((o) => ["ACTIVE", "REVISED", "SELECTED"].includes(o.status));
  const selectedId = summary.selection?.offerId;

  if (!offers.length) return null;

  return (
    <section data-testid="freightiq-vessel-picker" className="space-y-3">
      <div>
        <span className="dmx-eyebrow text-zinc-500">{t("order.freightiq.vesselOptionsEyebrow")}</span>
        <h3 className="font-display text-lg font-semibold mt-0.5">{t("order.freightiq.vesselOptionsTitle")}</h3>
        <p className="text-sm text-zinc-500 mt-1">{t("order.freightiq.vesselOptionsHint")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {offers.map((o) => {
          const badges = badgesFor(o, summary);
          const isSelected = selectedId === o.id;
          const vesselLabel = o.vesselName?.trim() || t("order.freightiq.vesselTbc");

          return (
            <article
              key={o.id}
              data-testid={`freightiq-vessel-card-${o.id}`}
              className={cn(
                "dmx-card p-4 flex flex-col gap-3 transition-shadow",
                isSelected && "ring-2 ring-emerald-500/40 bg-emerald-50/30",
                badges.length > 0 && !isSelected && "ring-1 ring-accent-900/10",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-800 grid place-items-center shrink-0">
                    <Ship className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate">{vesselLabel}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{o.carrierName} · {o.providerName}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold tabular-nums">{o.price.toLocaleString()} {o.currency}</div>
                  <div className="text-xs text-zinc-500">{o.transitDays}d transit</div>
                </div>
              </div>

              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {badges.map((b) => (
                    <span key={b} className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {b}
                    </span>
                  ))}
                </div>
              )}

              <dl className="grid grid-cols-3 gap-2 text-xs border-t border-paper-100 pt-3">
                <div>
                  <dt className="text-zinc-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> ETD</dt>
                  <dd className="font-medium mt-0.5">{fmtDate(o.etd)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 flex items-center gap-1"><Anchor className="h-3 w-3" /> ETA</dt>
                  <dd className="font-medium mt-0.5">{fmtDate(o.eta)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Cut-off</dt>
                  <dd className="font-medium mt-0.5">{fmtDate(o.cutOff)}</dd>
                </div>
              </dl>

              <div className="mt-auto pt-1">
                {isSelected ? (
                  <span data-testid={`freightiq-vessel-selected-${o.id}`} className="text-sm font-medium text-emerald-800">
                    {t("order.freightiq.selected")}
                  </span>
                ) : canSelect ? (
                  <button
                    type="button"
                    data-testid={`freightiq-select-vessel-${o.id}`}
                    className="dmx-btn-primary w-full text-sm"
                    disabled={busy}
                    onClick={() => onRequestSelect(o.id)}
                  >
                    {t("order.freightiq.selectVessel")}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
