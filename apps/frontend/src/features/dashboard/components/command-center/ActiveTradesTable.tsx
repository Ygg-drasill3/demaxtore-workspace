import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import type { ActiveTradeRow } from "../../lib/buyer-command-center";

const TYPE_STYLES: Record<ActiveTradeRow["type"], string> = {
  RFQ: "bg-blue-50 text-blue-800",
  CommodityBid: "bg-violet-50 text-violet-800",
  PO: "bg-indigo-50 text-indigo-800",
  Order: "bg-accent-50 text-accent-900",
  Shipment: "bg-emerald-50 text-emerald-800",
};

export function ActiveTradesTable({ rows, loading }: { rows?: ActiveTradeRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="cc-active-trades" className="dmx-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.pipeline")}</span>
        <h2 className="font-display text-xl font-semibold mt-0.5">{t("dash.activeTrades.title")}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">{t("dash.common.reference")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.type")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.stage")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.nextAction")}</th>
              <th className="text-right px-4 py-3">{t("dash.common.open")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">{t("dash.common.loadingTrades")}</td></tr>
            ) : !rows?.length ? (
              <tr>
                <td colSpan={5} data-testid="cc-trades-empty" className="px-4 py-10 text-center text-zinc-500">
                  No active trades. Create an RFQ or schedule a CommodityBid auction to get started.
                </td>
              </tr>
            ) : rows.map((r) => (
              <tr key={`${r.type}-${r.id}`} data-testid={`cc-trade-row-${r.type}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-4 py-3 font-mono text-xs font-medium">{r.ref}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full", TYPE_STYLES[r.type])}>
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-zinc-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
                    {r.stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-ink-900">{r.nextAction}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={r.workspaceUrl} data-testid={`cc-trade-open-${r.id}`} className="dmx-btn-primary text-xs inline-flex">
                    {t("dash.common.open")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
