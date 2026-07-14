import type { ConversationOperationalHeader } from "@dmx/contracts/conversation-hub";
import { formatWhen } from "../lib/conversation-hub.utils";

interface Props {
  header: ConversationOperationalHeader;
}

function PartyCell({ label, name, company }: { label: string; name: string | null; company?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">{label}</p>
      <p className="text-sm font-medium text-zinc-900 truncate">{name ?? "—"}</p>
      {company && <p className="text-xs text-zinc-500 truncate">{company}</p>}
    </div>
  );
}

export default function ConversationHubHeader({ header }: Props) {
  return (
    <header data-testid="hub-operational-header" className="border-b border-zinc-100 bg-white">
      <div className="px-4 py-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Conversation Hub</p>
            <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">
              {header.workspaceRef}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {header.workspaceType} · {header.workspaceId.slice(0, 8)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
              {header.workspaceStatus}
            </span>
            {(header.unreadCount ?? 0) > 0 && (
              <span
                data-testid="hub-unread-badge"
                className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
              >
                {header.unreadCount} unread
              </span>
            )}
            {(header.pendingActionsCount ?? 0) > 0 && (
              <span
                data-testid="hub-pending-badge"
                className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800"
              >
                {header.pendingActionsCount} pending
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <PartyCell label="Buyer" name={header.buyer?.fullName ?? null} company={header.buyer?.company} />
          <PartyCell label="Supplier" name={header.supplier?.fullName ?? null} company={header.supplier?.company} />
          <PartyCell
            label="DeMaxtore Rep"
            name={header.demaxtoreRep?.fullName ?? null}
            company={header.demaxtoreRep?.company}
          />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Last Activity</p>
            <p className="text-sm text-zinc-700">
              {header.lastActivityAt ? formatWhen(header.lastActivityAt) : "No activity yet"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
