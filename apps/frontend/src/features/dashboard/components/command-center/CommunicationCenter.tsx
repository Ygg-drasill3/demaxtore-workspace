import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { CommunicationRow } from "../../lib/buyer-command-center";
import { displayRef } from "../../lib/display-ref";

export function CommunicationCenter({ rows, loading }: { rows?: CommunicationRow[]; loading?: boolean }) {
  const { t } = useT();
  const unread = rows?.reduce((n, r) => n + r.unreadCount, 0) ?? 0;

  return (
    <section data-testid="cc-messages" className="dmx-card p-5">
      <div className="flex justify-between items-start gap-2 mb-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{t("dash.communication.title")}</h2>
        </div>
        {unread > 0 && (
          <span data-testid="cc-messages-unread" className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded-full">
            {unread} unread
          </span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingConversations")}</p>
      ) : !rows?.length ? (
        <p data-testid="cc-messages-empty" className="text-sm text-zinc-500">{t("dash.communication.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 5).map((m) => (
            <li key={m.workspaceId} data-testid="cc-message-row" className="p-3 rounded-lg border border-zinc-100">
              <div className="flex justify-between gap-2">
                <span className="font-mono text-xs">{displayRef(m.workspaceRef)}</span>
                <span className="text-[10px] uppercase text-zinc-400">{m.workspaceType}</span>
              </div>
              <p className="text-sm text-zinc-700 mt-1 truncate">{m.lastMessage}</p>
              <Link to={m.workspaceUrl} data-testid={`cc-message-open-${m.workspaceId}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.openArrow")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/buyer/messages" data-testid="cc-messages-all" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
