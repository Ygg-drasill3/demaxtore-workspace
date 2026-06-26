import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { UpcomingOpsEvent } from "../../lib/operations-command-center";

export function OperationsUpcomingEvents({ events, loading }: { events?: UpcomingOpsEvent[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="oc-upcoming-events" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.timeline")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.events.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingEvents")}</p>
      ) : !events?.length ? (
        <p data-testid="oc-events-empty" className="text-sm text-zinc-500">{t("dash.events.emptyShort")}</p>
      ) : (
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} data-testid={`oc-event-${e.kind}`} className="flex gap-3 p-2 rounded-lg hover:bg-zinc-50">
              <time className="text-xs text-zinc-400 shrink-0 w-20">{new Date(e.at).toLocaleDateString()}</time>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{e.label}</p>
                <Link to={e.workspaceUrl} className="text-xs text-blue-900 hover:underline">{t("dash.common.open")}</Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
