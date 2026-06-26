import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { SupplierAction } from "../../lib/supplier-command-center";

const STYLES = {
  high: "bg-red-50 text-red-800 border-red-200",
  medium: "bg-amber-50 text-amber-900 border-amber-200",
  low: "bg-zinc-50 text-zinc-700 border-zinc-200",
};

export function SupplierActionInbox({ actions, loading }: { actions?: SupplierAction[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="sc-action-inbox" data-testid="sc-action-inbox" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.priority")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.actionInbox.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !actions?.length ? (
        <p data-testid="sc-action-empty" className="text-sm text-zinc-500">{t("dash.actionInbox.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {actions.map((a) => (
            <li key={a.id} data-testid={`sc-action-${a.kind}`} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-zinc-100">
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${STYLES[a.priority]}`}>{t(`priority.${a.priority}`)}</span>
                <p className="text-sm font-medium mt-1">{a.title}</p>
                <p className="text-xs text-zinc-500">{a.dueLabel}</p>
              </div>
              <Link to={a.workspaceUrl} data-testid={`sc-action-btn-${a.id}`} className="dmx-btn-primary text-sm shrink-0">
                {a.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
