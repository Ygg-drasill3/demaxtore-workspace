import { useState } from "react";
import type { FreightOffer } from "@dmx/contracts/freightiq";
import { Anchor, ChevronDown, Clock, Heart, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";

export type OfferHighlight = "best_price" | "fastest" | "earliest_etd" | "cutoff_soon" | null;

interface Props {
  offer: FreightOffer;
  pol: string;
  pod: string;
  highlight: OfferHighlight;
  selected?: boolean;
  canSelect?: boolean;
  onRequestSelect?: (offerId: string) => void;
  busy?: boolean;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmtPrice(price: number, currency: string): string {
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
  return `${sym}${price.toLocaleString()}`;
}

function highlightLabel(h: OfferHighlight, t: (k: string) => string): string | null {
  if (h === "best_price") return t("order.freightiq.badgeBestPrice");
  if (h === "fastest") return t("order.freightiq.badgeFastest");
  if (h === "earliest_etd") return t("order.freightiq.badgeEarliest");
  if (h === "cutoff_soon") return t("order.freightiq.badgeCutoff");
  return null;
}

export function FreightOfferListCard({
  offer, pol, pod, highlight, selected, canSelect, onRequestSelect, busy,
}: Props) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const vesselLabel = offer.vesselName?.trim() || t("order.freightiq.vesselTbc");
  const badge = highlightLabel(highlight, t);

  return (
    <article
      data-testid={`freightiq-offer-card-${offer.id}`}
      className={cn(
        "dmx-card overflow-hidden transition-shadow",
        selected && "ring-2 ring-emerald-500/50",
      )}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Thumbnail */}
        <div className="relative w-full lg:w-44 h-36 lg:h-auto shrink-0 bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
          <div className="absolute inset-0 flex items-center justify-center text-blue-300/80">
            <Ship className="h-16 w-16" strokeWidth={1.25} />
          </div>
          <button
            type="button"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 shadow-sm grid place-items-center text-zinc-400 hover:text-rose-500"
            aria-label="Save"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart className="h-4 w-4" />
          </button>
          <span className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
            1/1
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 p-4 min-w-0 border-b lg:border-b-0 lg:border-r border-paper-100">
          <h4 className="font-display text-xl font-semibold text-ink-900">{offer.carrierName}</h4>
          <p className="text-xs text-emerald-700 mt-1">
            {offer.providerName}
            {offer.transitDays <= 28 ? ` · ${t("order.freightiq.reliableTransit")}` : ""}
          </p>

          <p className="flex items-center gap-1.5 text-sm font-medium text-ink-800 mt-3">
            <Ship className="h-4 w-4 text-zinc-500 shrink-0" />
            {vesselLabel}
          </p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-zinc-500">{t("order.freightiq.departurePort")}</dt>
              <dd className="font-semibold text-sm mt-0.5">{pol}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-zinc-500">{t("order.freightiq.destinationPort")}</dt>
              <dd className="font-semibold text-sm mt-0.5">{pod}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-zinc-500">{t("order.freightiq.cutoff")}</dt>
              <dd className="font-semibold text-sm mt-0.5">{fmtDate(offer.cutOff)}</dd>
            </div>
          </div>
        </div>

        {/* Price panel */}
        <div className="w-full lg:w-52 shrink-0 p-4 bg-paper-50/80 flex flex-col justify-center items-end text-right gap-2">
          {badge && !selected && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 bg-emerald-100 px-2 py-1 rounded">
              ✓ {badge}
            </span>
          )}
          {selected && (
            <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-100 px-2 py-1 rounded">
              {t("order.freightiq.selected")}
            </span>
          )}
          <div className="font-display text-3xl font-bold text-emerald-700 tabular-nums">
            {fmtPrice(offer.price, offer.currency)}
          </div>
          <p className="text-xs text-zinc-600 flex items-center gap-1 justify-end">
            <Clock className="h-3.5 w-3.5" />
            {t("order.freightiq.estimatedTransit").replace("{days}", String(offer.transitDays))}
          </p>
          {canSelect && !selected && (
            <button
              type="button"
              data-testid={`freightiq-select-offer-${offer.id}`}
              className="dmx-btn-primary text-xs mt-1 w-full lg:w-auto"
              disabled={busy}
              onClick={() => onRequestSelect?.(offer.id)}
            >
              {t("order.freightiq.selectVessel")}
            </button>
          )}
        </div>
      </div>

      {/* Expandable footer */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm border-t border-paper-100 hover:bg-paper-50/80"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`freightiq-offer-expand-${offer.id}`}
      >
        <span className="text-zinc-600 tabular-nums">
          {fmtPrice(offer.price, offer.currency)} · {vesselLabel}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div
          data-testid={`freightiq-offer-details-${offer.id}`}
          className="px-4 pb-4 pt-2 border-t border-paper-100 bg-paper-50/40 text-sm space-y-3"
        >
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><dt className="text-zinc-500">ETD</dt><dd className="font-medium">{fmtDate(offer.etd)}</dd></div>
            <div><dt className="text-zinc-500">ETA</dt><dd className="font-medium">{fmtDate(offer.eta)}</dd></div>
            <div><dt className="text-zinc-500">{t("order.freightiq.forwarder")}</dt><dd className="font-medium">{offer.providerName}</dd></div>
            <div><dt className="text-zinc-500">{t("order.freightiq.validUntil")}</dt><dd className="font-medium">{fmtDate(offer.validUntil)}</dd></div>
          </dl>
          {offer.remarks && <p className="text-xs text-zinc-600">{offer.remarks}</p>}
          {canSelect && !selected && (
            <button
              type="button"
              className="dmx-btn-secondary text-xs inline-flex items-center gap-1"
              disabled={busy}
              onClick={() => onRequestSelect?.(offer.id)}
            >
              <Anchor className="h-3.5 w-3.5" />
              {t("order.freightiq.selectThisSailing")}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
