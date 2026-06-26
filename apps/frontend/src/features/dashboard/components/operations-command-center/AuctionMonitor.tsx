import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { AuctionMonitorRow } from "../../lib/operations-command-center";

export function AuctionMonitor({ rows, loading }: { rows?: AuctionMonitorRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-auction-monitor" data-testid="oc-auction-monitor" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.commoditybid")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.auctionMonitor.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !rows?.length ? (
        <p data-testid="oc-auctions-empty" className="text-sm text-zinc-500">{t("dash.liveAuctions.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li key={a.id} data-testid={`oc-auction-${a.state}`} className="p-3 rounded-lg border border-zinc-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs">{a.ref}</span>
                <span className="text-[10px] uppercase bg-violet-50 text-violet-900 px-1.5 py-0.5 rounded">{a.state}</span>
                {a.needsApproval && (
                  <span data-testid="oc-auction-approval" className="text-[10px] uppercase bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">{t("dash.auctionMonitor.pendingApproval")}</span>
                )}
              </div>
              <p className="text-sm mt-1">{a.title}</p>
              <div className="flex gap-3 text-xs text-zinc-500 mt-1">
                {a.participationPct != null && <span>{a.participationPct}% participation</span>}
                {a.lowestBid != null && <span>Lowest: ${a.lowestBid}</span>}
              </div>
              <Link to={a.workspaceUrl} data-testid={`oc-auction-open-${a.id}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.open")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/admin/commoditybid" data-testid="oc-auctions-all" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
