import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { SupplierCommRow } from "../../lib/supplier-command-center";

export function SupplierCommunicationCenter({ rows, loading }: { rows?: SupplierCommRow[]; loading?: boolean }) {
  const { t } = useT();
  const unread = rows?.reduce((n, r) => n + r.unreadCount, 0) ?? 0;

  return (
    <section data-testid="sc-messages" className="dmx-card p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.collaboration")}</span>
          <h2 className="font-display text-xl font-semibold mt-0.5">{t("dash.communication.title")}</h2>
        </div>
        {unread > 0 && (
          <span data-testid="sc-messages-unread" className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded-full">{unread} unread</span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !rows?.length ? (
        <p data-testid="sc-messages-empty" className="text-sm text-zinc-500">{t("dash.communication.supplierEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 5).map((m) => (
            <li key={m.workspaceId} data-testid="sc-message-row" className="p-3 rounded-lg border border-zinc-100">
              <div className="flex justify-between">
                <span className="font-mono text-xs">{m.workspaceRef}</span>
                <span className="text-[10px] uppercase text-zinc-400">{m.workspaceType}</span>
              </div>
              <p className="text-sm truncate mt-1">{m.lastMessage}</p>
              <Link to={m.workspaceUrl} data-testid={`sc-message-open-${m.workspaceId}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.openArrow")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/supplier/messages" data-testid="sc-messages-all" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
