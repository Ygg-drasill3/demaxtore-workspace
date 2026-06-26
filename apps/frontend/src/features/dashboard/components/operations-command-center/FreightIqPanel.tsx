import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { FreightOpsRow } from "../../lib/operations-command-center";

export function FreightIqPanel({ rows, loading }: { rows?: FreightOpsRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-freight" data-testid="oc-freight-panel" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.freightiq")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.freight.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !rows?.length ? (
        <p data-testid="oc-freight-empty" className="text-sm text-zinc-500">{t("dash.freight.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} data-testid="oc-freight-row" className="p-3 rounded-lg border border-zinc-100">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-[10px] uppercase text-zinc-500">{r.status}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{r.detail}</p>
              <Link to={r.workspaceUrl} data-testid={`oc-freight-open-${r.id}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.open")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/operations/freight" data-testid="oc-freight-all" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
