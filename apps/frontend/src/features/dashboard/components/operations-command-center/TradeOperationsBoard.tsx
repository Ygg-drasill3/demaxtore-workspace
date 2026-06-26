import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { TradeBoardRow } from "../../lib/operations-command-center";

const RISK_STYLES = {
  critical: "text-red-700 bg-red-50",
  high: "text-amber-800 bg-amber-50",
  medium: "text-blue-800 bg-blue-50",
  low: "text-zinc-600 bg-zinc-50",
};

export function TradeOperationsBoard({ rows, loading }: { rows?: TradeBoardRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-trade-board" data-testid="oc-trade-board" className="dmx-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.execution")}</span>
        <h2 className="font-display text-xl font-semibold mt-0.5">{t("dash.tradeBoard.title")}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">{t("dash.common.ref")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.type")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.status")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.owner")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.risk")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.nextActionTitle")}</th>
              <th className="text-right px-4 py-3">{t("dash.common.open")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">{t("dash.common.loading")}</td></tr>
            ) : !rows?.length ? (
              <tr><td colSpan={7} data-testid="oc-trade-empty" className="px-4 py-10 text-center text-zinc-500">{t("dash.tradeBoard.empty")}</td></tr>
            ) : rows.map((r) => (
              <tr key={`${r.type}-${r.id}`} data-testid={`oc-trade-${r.type}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-4 py-3 font-mono text-xs">{r.ref}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3 text-zinc-600">{r.owner}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${RISK_STYLES[r.riskLevel]}`}>
                    {r.riskLevel === "critical" ? r.riskLevel : t(`priority.${r.riskLevel}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">{r.nextAction}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={r.workspaceUrl} data-testid={`oc-trade-open-${r.id}`} className="text-sm font-medium text-blue-900 hover:underline">{t("dash.common.open")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
