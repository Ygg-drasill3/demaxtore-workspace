import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import type { RequiredAction } from "../../lib/buyer-command-center";

const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-800 border-red-200",
  medium: "bg-amber-50 text-amber-900 border-amber-200",
  low: "bg-zinc-50 text-zinc-700 border-zinc-200",
};

export function ActionInbox({ actions, loading }: { actions?: RequiredAction[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="cc-action-inbox" data-testid="cc-action-inbox" data-guide="dashboard-pending-actions" className="dmx-card p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.priority")}</span>
          <h2 className="font-display text-xl font-semibold mt-0.5">{t("dash.actionInbox.title")}</h2>
        </div>
        {!loading && actions && (
          <span data-testid="cc-action-count" className="text-sm font-medium text-zinc-600">
            {actions.length} {actions.length !== 1 ? t("dash.common.items") : t("dash.common.item")}
          </span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingActions")}</p>
      ) : !actions?.length ? (
        <p data-testid="cc-action-empty" className="text-sm text-zinc-500">
          {t("dash.actionInbox.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {actions.map((a) => (
            <li
              key={a.id}
              data-testid={`cc-action-${a.kind}`}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50/80"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[a.priority]}`}>
                    {t(`priority.${a.priority}`)}
                  </span>
                  <span className="text-sm font-medium text-ink-900">{a.title}</span>
                </div>
                <p className={cn(
                  "text-xs mt-1",
                  a.priority === "high" ? "text-red-600 font-medium" : "text-zinc-500",
                )}>
                  {a.priority === "high" ? t("dash.common.urgent") : ""}{a.dueLabel}
                </p>
              </div>
              <Link
                to={a.workspaceUrl}
                data-testid={`cc-action-btn-${a.id}`}
                className="dmx-btn-primary text-sm shrink-0 self-start sm:self-center"
              >
                {a.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
