import { cn } from "@/lib/utils";

type Lot = {
  commodity: string;
  quantity: number;
  uom: string;
  incoterms?: string | null;
};

type AuctionStatus = {
  lowestBidAmount?: number | null;
  contractValue?: number | null;
  savingsAchieved?: number | null;
  savingsPercent?: number | null;
  secondsRemaining?: number;
  secondsUntilStart?: number;
};

type SupplierRow = {
  displayName?: string;
  bidderCode?: string;
  status?: string;
  joinedAt?: string | null;
};

const FLOW_STEPS = [
  "Create Bid",
  "Schedule Auction",
  "Invite Suppliers",
  "Auction Starts",
  "Suppliers Compete",
  "Auction Ends",
  "Lowest Bid Wins",
  "Share Winner",
  "Buyer Approval",
  "Order Execution",
] as const;

function fmtMoney(n: number, currency = "USD") {
  if (n >= 1_000_000) return `${currency === "USD" ? "$" : ""}${(n / 1_000_000).toFixed(1)}M`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function flowStepIndex(state: string): number {
  const map: Record<string, number> = {
    BID_DRAFT: 0,
    SCHEDULED: 1,
    INVITING_SUPPLIERS: 2,
    READY_TO_START: 3,
    LIVE: 4,
    CLOSED: 5,
    WINNER_IDENTIFIED: 6,
    AWAITING_BUYER_APPROVAL: 7,
    APPROVED: 8,
    ORDERS_SPAWNED: 9,
  };
  return map[state] ?? 0;
}

export function CommodityBidBuyerHero({
  title,
  externalRef,
  state,
  currency,
  lots,
  status,
  participation,
}: {
  title: string;
  externalRef: string;
  state: string;
  currency: string;
  lots: Lot[];
  status?: AuctionStatus;
  participation?: { invited?: number; joined?: number; suppliers?: SupplierRow[] };
}) {
  const primaryLot = lots[0];
  const deliveryLabel = primaryLot?.incoterms
    ? `${primaryLot.incoterms}${primaryLot.incoterms.includes(" ") ? "" : " destination"}`
    : null;
  const activeStep = flowStepIndex(state);
  const isLive = state === "LIVE";
  const countdown = isLive
    ? status?.secondsRemaining ?? 0
    : ["SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START"].includes(state)
      ? status?.secondsUntilStart ?? 0
      : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section data-testid="cb-auction-hero-left" className="dmx-card p-6 bg-gradient-to-br from-ink-950 to-ink-800 text-white">
          <span className="text-[11px] uppercase tracking-widest text-white/60">{externalRef}</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">{title}</h1>
          <p className="text-lg font-medium text-emerald-300 mt-4">Timed Auctions. Lowest Bid Wins.</p>
          <p className="text-sm text-white/75 mt-2 max-w-md">
            Compete Manufacturers. Factory Direct Prices. Full Transparency.
          </p>
          {primaryLot && (
            <div data-testid="cb-lot-summary" className="mt-6 space-y-1 text-sm text-white/90">
              <p className="text-xl font-semibold text-white">{primaryLot.commodity}</p>
              <p>
                {primaryLot.quantity.toLocaleString()} {primaryLot.uom}
                {deliveryLabel ? ` · ${deliveryLabel}` : ""}
              </p>
            </div>
          )}
          {countdown != null && countdown > 0 && (
            <p data-testid="cb-hero-countdown" className="mt-4 text-sm text-white/70">
              {isLive ? "Auction closes in " : "Auction starts in "}
              <span className="font-mono text-white font-semibold">{fmtCountdown(countdown)}</span>
            </p>
          )}
        </section>

        <section data-testid="cb-auction-hero-right" className="dmx-card p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Manufacturers competing</p>
            <p data-testid="cb-manufacturer-count" className="text-2xl font-semibold mt-1">
              {participation?.invited ?? 0} Manufacturers
            </p>
          </div>

          <ul data-testid="cb-manufacturer-list" className="space-y-2">
            {(participation?.suppliers ?? []).slice(0, 8).map((s) => (
              <li
                key={s.bidderCode ?? s.displayName}
                className="flex items-center justify-between text-sm rounded-lg border border-zinc-100 px-3 py-2"
              >
                <span className="font-medium">{s.displayName ?? "Qualified Manufacturer"}</span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    s.joinedAt || s.status === "JOINED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {s.joinedAt || s.status === "JOINED" ? "Competing" : "Invited"}
                </span>
              </li>
            ))}
            {!participation?.suppliers?.length && (
              <li className="text-sm text-zinc-500">Suppliers will appear once invitations are sent.</li>
            )}
          </ul>

          <div className="grid gap-3 sm:grid-cols-2">
            <div data-testid="cb-lowest-bid" className="rounded-xl bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Lowest Valid Bid</p>
              <p className="text-2xl font-semibold mt-1 tabular-nums">
                {status?.lowestBidAmount != null
                  ? fmtMoney(status.lowestBidAmount, currency) + ` / ${primaryLot?.uom ?? "unit"}`
                  : "—"}
              </p>
            </div>
            <div data-testid="cb-contract-value" className="rounded-xl bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Estimated Contract Value</p>
              <p className="text-2xl font-semibold mt-1 tabular-nums">
                {status?.contractValue != null ? fmtMoney(status.contractValue, currency) : "—"}
              </p>
            </div>
          </div>

          {status?.savingsAchieved != null && status.savingsAchieved > 0 && (
            <div data-testid="cb-savings-achieved" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-800">Savings Achieved</p>
              <p className="text-2xl font-semibold text-emerald-900 mt-1 tabular-nums">
                {fmtMoney(status.savingsAchieved, currency)}
              </p>
              {status.savingsPercent != null && (
                <p className="text-sm text-emerald-700 mt-1">
                  {status.savingsPercent.toFixed(1)}% below opening bid
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <section data-testid="cb-process-flow" className="dmx-card p-5 overflow-x-auto">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">How CommodityBid works</p>
        <ol className="flex gap-2 min-w-max">
          {FLOW_STEPS.map((step, i) => (
            <li
              key={step}
              data-testid={`cb-flow-step-${i + 1}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs shrink-0",
                i <= activeStep ? "bg-accent-900/10 text-accent-900 font-medium" : "bg-zinc-50 text-zinc-500",
              )}
            >
              <span className="font-mono text-[10px] opacity-70">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
