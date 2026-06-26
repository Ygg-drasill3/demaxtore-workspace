import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { RevenueSnapshot } from "../../lib/operations-command-center";

export function RevenuePanel({ revenue, loading }: { revenue?: RevenueSnapshot; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-revenue" data-testid="oc-revenue" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.commercial")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.revenue.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div data-testid="oc-revenue-month" className="p-3 rounded-lg bg-zinc-50">
            <div className="text-[10px] uppercase text-zinc-500">{t("dash.revenue.thisMonth")}</div>
            <div className="font-display text-xl font-semibold tabular-nums">${(revenue?.monthUsd ?? 0).toLocaleString()}</div>
          </div>
          <div data-testid="oc-revenue-pending" className="p-3 rounded-lg bg-amber-50">
            <div className="text-[10px] uppercase text-amber-800">{t("dash.revenue.pending")}</div>
            <div className="font-display text-xl font-semibold tabular-nums text-amber-900">${(revenue?.pendingUsd ?? 0).toLocaleString()}</div>
          </div>
          <div data-testid="oc-revenue-realized" className="p-3 rounded-lg bg-emerald-50">
            <div className="text-[10px] uppercase text-emerald-800">{t("dash.revenue.realized")}</div>
            <div className="font-display text-xl font-semibold tabular-nums text-emerald-900">${(revenue?.realizedUsd ?? 0).toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50 col-span-2 text-sm">
            <div><span className="text-zinc-500">{t("dash.revenue.topRoute")}</span> <span data-testid="oc-revenue-top-route">{revenue?.topRoute ?? "—"}</span></div>
            <div className="mt-1"><span className="text-zinc-500">{t("dash.revenue.topForwarder")}</span> <span data-testid="oc-revenue-top-forwarder">{revenue?.topForwarder ?? "—"}</span></div>
          </div>
        </div>
      )}
      <Link to="/operations/freight-commercial" data-testid="oc-revenue-all" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
