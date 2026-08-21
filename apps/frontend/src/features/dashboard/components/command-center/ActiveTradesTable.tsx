import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import type { ActiveTradeRow } from "../../lib/buyer-command-center";
import { displayRef } from "../../lib/display-ref";

const TYPE_STYLES: Record<ActiveTradeRow["type"], string> = {
  RFQ: "bg-blue-50 text-blue-800",
  CommodityBid: "bg-violet-50 text-violet-800",
  PO: "bg-indigo-50 text-indigo-800",
  Order: "bg-accent-50 text-accent-900",
  Shipment: "bg-emerald-50 text-emerald-800",
};

const TYPE_LABELS: Record<ActiveTradeRow["type"], string> = {
  RFQ: "Quote request",
  CommodityBid: "Auction",
  PO: "Purchase order",
  Order: "Order",
  Shipment: "Shipment",
};

export function ActiveTradesTable({ rows, loading }: { rows?: ActiveTradeRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="cc-active-trades" className="dmx-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h2 className="font-display text-xl font-semibold">{t("dash.activeTrades.title")}</h2>
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
                  {t("dash.activeTrades.empty", "Nothing in progress yet. Create a quote request to get started.")}
                </td>
              </tr>
            ) : rows.map((r) => (
              <tr key={`${r.type}-${r.id}`} data-testid={`cc-trade-row-${r.type}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-4 py-3 text-xs font-medium">{displayRef(r.ref)}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", TYPE_STYLES[r.type])}>
                    {TYPE_LABELS[r.type]}
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
                  <Link to={r.workspaceUrl} data-testid={`cc-trade-open-${r.id}`} className="text-sm font-medium text-accent-900 hover:underline inline-flex">
                    {t("dash.common.openArrow")}
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
