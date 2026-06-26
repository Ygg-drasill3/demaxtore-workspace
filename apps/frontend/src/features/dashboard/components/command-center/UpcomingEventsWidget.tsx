import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { UpcomingEvent } from "../../lib/buyer-command-center";

export function UpcomingEventsWidget({ events, loading }: { events?: UpcomingEvent[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="cc-upcoming-events" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.timeline")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.events.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingEvents")}</p>
      ) : !events?.length ? (
        <p data-testid="cc-events-empty" className="text-sm text-zinc-500">{t("dash.events.empty")}</p>
      ) : (
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} data-testid={`cc-event-${e.kind}`} className="flex gap-3 items-start p-2 rounded-lg hover:bg-zinc-50">
              <time className="text-xs text-zinc-500 shrink-0 w-24 pt-0.5">
                {new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </time>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-900">{e.label}</p>
                <Link to={e.workspaceUrl} className="text-xs text-blue-900 hover:underline">{t("dash.common.openArrow")}</Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
