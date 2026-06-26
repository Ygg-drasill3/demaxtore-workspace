import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { OpportunityRow } from "../../lib/supplier-command-center";

function countdown(endsAt: string | null): string {
  if (!endsAt) return "";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const m = Math.floor(ms / 60_000);
  return m < 60 ? `${m}m left` : `${Math.floor(m / 60)}h left`;
}

export function OpportunityCenter({ rows, loading }: { rows?: OpportunityRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="sc-opportunity-center" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.commercial")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.opportunity.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !rows?.length ? (
        <p data-testid="sc-opportunities-empty" className="text-sm text-zinc-500">No open RFQ invitations or auctions.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((o) => (
            <li key={`${o.type}-${o.id}`} data-testid={`sc-opportunity-${o.type}`} className="p-3 rounded-lg border border-zinc-100">
              <div className="flex justify-between gap-2">
                <span className="font-mono text-xs">{o.ref}</span>
                <span className="text-[10px] uppercase text-zinc-400">{o.type}</span>
              </div>
              <p className="text-sm font-medium mt-1 truncate">{o.title}</p>
              <p className="text-xs text-zinc-600 mt-1">{o.participationStatus}</p>
              {o.state === "LIVE" && o.auctionEndsAt && (
                <span data-testid="sc-auction-countdown" className="text-xs text-emerald-700">{countdown(o.auctionEndsAt)}</span>
              )}
              <Link to={o.workspaceUrl} data-testid={`sc-opportunity-open-${o.id}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.openArrow")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/supplier/rfq" data-testid="sc-opportunities-rfq" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block mr-4">
        {t("dash.common.openArrow")}
      </Link>
      <Link to="/supplier/commoditybid" data-testid="sc-opportunities-auctions" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
