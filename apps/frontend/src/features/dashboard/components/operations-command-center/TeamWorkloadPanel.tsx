import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { WorkloadRow } from "../../lib/operations-command-center";

export function TeamWorkloadPanel({
  rows,
  unassignedCount,
  loading,
}: {
  rows?: WorkloadRow[];
  unassignedCount?: number;
  loading?: boolean;
}) {
  const { t } = useT();

  return (
    <section id="oc-workload" data-testid="oc-workload" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.workload")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.teamWorkload.title")}</h2>
      {unassignedCount != null && unassignedCount > 0 && (
        <p data-testid="oc-unassigned" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          {unassignedCount} trades with assignment gaps
        </p>
      )}
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !rows?.length ? (
        <p data-testid="oc-workload-empty" className="text-sm text-zinc-500">No operator workload data.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((w) => (
            <li key={w.userId} data-testid={`oc-workload-${w.userId}`} className="p-3 rounded-lg border border-zinc-100 flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium">{w.displayName}</span>
                {w.overloaded && (
                  <span data-testid="oc-workload-overloaded" className="ml-2 text-[10px] uppercase bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Overloaded</span>
                )}
                <p className="text-xs text-zinc-500 mt-0.5">{w.openAlerts} alerts</p>
              </div>
              <span className="font-display text-xl font-semibold tabular-nums">{w.totalLoad}</span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/operations/executive" data-testid="oc-workload-executive" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
