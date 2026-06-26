import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { AlertGroupRow } from "../../lib/operations-command-center";

const SEV_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-50 text-red-800 border-red-200",
  WARNING: "bg-amber-50 text-amber-900 border-amber-200",
  INFO: "bg-blue-50 text-blue-800 border-blue-200",
};

export function ControlTowerPanel({ groups, loading }: { groups?: AlertGroupRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-control-tower" data-testid="oc-control-tower" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.alerts")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.controlTower.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !groups?.length ? (
        <p data-testid="oc-alerts-empty" className="text-sm text-zinc-500">{t("dash.controlTower.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.severity} data-testid={`oc-alert-group-${g.severity}`} className={`p-3 rounded-lg border ${SEV_STYLES[g.severity] ?? ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{g.severity}</span>
                <span data-testid={`oc-alert-count-${g.severity}`} className="font-display text-xl tabular-nums">{g.count}</span>
              </div>
              <p className="text-xs mt-1 opacity-80 truncate">{g.sampleTitle}</p>
              {g.workspaceUrl && (
                <Link to={g.workspaceUrl} data-testid={`oc-alert-open-${g.severity}`} className="text-sm font-medium hover:underline mt-2 inline-block">
                  {t("dash.common.open")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link to="/operations" data-testid="oc-control-tower-all" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.admin.fullTower")} →
      </Link>
    </section>
  );
}
