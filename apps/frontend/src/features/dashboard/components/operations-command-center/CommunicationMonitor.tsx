import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { CommOpsRow } from "../../lib/operations-command-center";

export function CommunicationMonitor({ rows, loading }: { rows?: CommOpsRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-communications" data-testid="oc-communications" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.collaboration")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.communication.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingConversations")}</p>
      ) : !rows?.length ? (
        <p data-testid="oc-communications-empty" className="text-sm text-zinc-500">No escalated conversations.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li key={m.id} data-testid="oc-comm-row" className="p-3 rounded-lg border border-zinc-100">
              <span className="font-mono text-xs">{m.workspaceRef}</span>
              <span className="ml-2 text-[10px] uppercase text-zinc-400">{m.workspaceType}</span>
              <p className="text-sm mt-1">{m.label}</p>
              {m.waitingHours != null && (
                <p className="text-xs text-amber-700">Waiting &gt;{m.waitingHours}h</p>
              )}
              <Link to={m.workspaceUrl} data-testid={`oc-comm-open-${m.id}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.open")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
