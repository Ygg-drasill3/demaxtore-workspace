import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { LiveAuctionRow } from "../../lib/buyer-command-center";

function formatCountdown(endsAt: string | null): string {
  if (!endsAt) return "—";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m left`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function LiveAuctionsWidget({ rows, loading }: { rows?: LiveAuctionRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="cc-live-auctions" className="dmx-card p-5">
      <h2 className="font-display text-xl font-semibold mb-4">{t("dash.liveAuctions.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingAuctions")}</p>
      ) : !rows?.length ? (
        <p data-testid="cc-auctions-empty" className="text-sm text-zinc-500">{t("dash.liveAuctions.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} data-testid={`cc-auction-row-${a.state}`} className="p-3 rounded-lg border border-zinc-100">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-zinc-500">{a.ref}</div>
                  <div className="text-sm font-medium truncate">{a.title || "Auction"}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  a.state === "LIVE" ? "bg-emerald-100 text-emerald-800" :
                  a.needsApproval ? "bg-amber-100 text-amber-900" : "bg-zinc-100 text-zinc-700"
                }`}>
                  {a.state.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-600">
                {a.state === "LIVE" && <span data-testid="cc-auction-countdown">{formatCountdown(a.auctionEndsAt)}</span>}
                {a.lowestBidAmount != null && <span>Lowest: {a.lowestBidAmount}</span>}
                {a.needsApproval && <span className="text-amber-700 font-medium">{t("dash.liveAuctions.approval")}</span>}
              </div>
              <Link to={a.workspaceUrl} data-testid={`cc-auction-open-${a.id}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.openArrow")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
