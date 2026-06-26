import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { OperationsAction } from "../../lib/operations-command-center";

const STYLES = {
  critical: "bg-red-100 text-red-900 border-red-300",
  high: "bg-amber-50 text-amber-900 border-amber-200",
  medium: "bg-blue-50 text-blue-900 border-blue-200",
  low: "bg-zinc-50 text-zinc-700 border-zinc-200",
};

export function OperationsActionInbox({ actions, loading }: { actions?: OperationsAction[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-action-inbox" data-testid="oc-action-inbox" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.priority")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.actionInbox.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !actions?.length ? (
        <p data-testid="oc-action-empty" className="text-sm text-zinc-500">No interventions required — platform is flowing.</p>
      ) : (
        <ul className="space-y-2">
          {actions.map((a) => (
            <li key={a.id} data-testid={`oc-action-${a.kind}`} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-zinc-100">
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${STYLES[a.priority]}`}>
                  {a.priority === "critical" ? a.priority : t(`priority.${a.priority}`)}
                </span>
                <span className="ml-2 text-[10px] uppercase text-zinc-400">{a.category}</span>
                <p className="text-sm font-medium mt-1">{a.title}</p>
                <p className="text-xs text-zinc-500">{a.dueLabel}</p>
              </div>
              <Link to={a.workspaceUrl} data-testid={`oc-action-btn-${a.id}`} className="dmx-btn-primary text-sm shrink-0">
                {a.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
