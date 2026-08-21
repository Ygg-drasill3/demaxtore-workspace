import type { FreightSummary } from "@dmx/contracts/freightiq";

interface Props {
  pol: string;
  pod: string;
  summary?: FreightSummary;
  orderRef?: string;
}

function formatCountdown(validUntil: string | null): string | null {
  if (!validUntil) return null;
  const ms = new Date(validUntil).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3_600_000);
  if (h < 48) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

export function FreightIqHero({ pol, pod, summary, orderRef }: Props) {
  const offers = summary?.offers ?? [];
  const activeOffers = offers.filter((o) => o.status === "ACTIVE" || o.status === "REVISED");
  const lowest = summary?.comparisonHints.lowestPriceOfferId
    ? offers.find((o) => o.id === summary.comparisonHints.lowestPriceOfferId)
    : null;
  const fastest = summary?.comparisonHints.fastestTransitOfferId
    ? offers.find((o) => o.id === summary.comparisonHints.fastestTransitOfferId)
    : null;
  const soonestExpiry = activeOffers
    .map((o) => ({ o, left: formatCountdown(o.validUntil) }))
    .find((x) => x.left && x.left !== "Expired");

  return (
    <section
      data-testid="freightiq-hero"
      className="relative overflow-hidden rounded-t-xl bg-gradient-to-br from-ink-950 via-[#0f1528] to-ink-800 text-white px-5 py-5 sm:px-6"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-600/20 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Freight</span>
          <h3 className="font-display text-2xl font-semibold tracking-tight mt-1">{pol} → {pod}</h3>
          {orderRef && <p className="text-xs text-white/60 mt-1 font-mono">#{orderRef}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <KpiPill label="Offers" value={String(activeOffers.length)} />
          {lowest && <KpiPill label="Lowest" value={`${lowest.price.toLocaleString()} ${lowest.currency}`} highlight />}
          {fastest && <KpiPill label="Fastest" value={`${fastest.transitDays}d`} />}
          {soonestExpiry?.left && <KpiPill label="Validity" value={soonestExpiry.left} warn />}
        </div>
      </div>
    </section>
  );
}

function KpiPill({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-xs ring-1 ${
      highlight ? "bg-emerald-500/15 ring-emerald-400/30 text-emerald-100"
      : warn ? "bg-amber-500/15 ring-amber-400/30 text-amber-100"
      : "bg-white/10 ring-white/15 text-white/80"
    }`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
