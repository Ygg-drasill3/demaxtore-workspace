import { Link } from "react-router-dom";
import {
  MessageSquare,
  ExternalLink,
  FileText,
  Ship,
} from "lucide-react";
import type { InboxWorkspaceCard } from "@dmx/contracts/workspace-inbox";
import { BADGE_LABELS, BADGE_STYLES, formatWhen } from "../lib/workspace-inbox.utils";

interface Props {
  workspaces: InboxWorkspaceCard[];
}

export default function InboxWorkspaceCards({ workspaces }: Props) {
  if (!workspaces.length) {
    return (
      <div data-testid="inbox-workspaces-empty" className="dmx-card p-8 text-center text-sm text-zinc-500">
        No workspaces match your filters.
      </div>
    );
  }

  return (
    <div
      data-testid="inbox-workspace-cards"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {workspaces.map((ws) => (
        <article
          key={ws.workspaceId}
          data-testid={`inbox-card-${ws.workspaceId}`}
          className="dmx-card p-4 flex flex-col gap-3 hover:shadow-md transition"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-zinc-900">{ws.workspaceRef}</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">{ws.workspaceType}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 truncate">{ws.productSummary ?? "—"}</p>
            </div>
            {ws.unreadCount > 0 && (
              <span className="shrink-0 text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                {ws.unreadCount} unread
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-zinc-400">Buyer</p>
              <p className="text-zinc-800 truncate">{ws.buyerName ?? "—"}</p>
            </div>
            <div>
              <p className="text-zinc-400">Supplier</p>
              <p className="text-zinc-800 truncate">{ws.supplierName ?? "—"}</p>
            </div>
            <div>
              <p className="text-zinc-400">Stage</p>
              <p className="text-zinc-800 truncate">{ws.currentStage}</p>
            </div>
            <div>
              <p className="text-zinc-400">Pending</p>
              <p className="text-zinc-800">{ws.pendingActionsCount}</p>
            </div>
          </div>

          {ws.badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ws.badges.map((b) => (
                <span
                  key={b}
                  data-testid={`inbox-badge-${b}`}
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${BADGE_STYLES[b]}`}
                >
                  {BADGE_LABELS[b]}
                </span>
              ))}
            </div>
          )}

          {ws.lastActivityPreview && (
            <p className="text-xs text-zinc-500 line-clamp-2 border-t border-zinc-100 pt-2">
              {ws.lastActivityPreview}
              {ws.lastActivityAt && (
                <span className="block text-[10px] text-zinc-400 mt-0.5">{formatWhen(ws.lastActivityAt)}</span>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-100 mt-auto">
            <Link
              to={ws.conversationUrl}
              data-testid={`inbox-open-conversation-${ws.workspaceId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-900 hover:underline"
            >
              <MessageSquare className="h-3 w-3" /> Conversation
            </Link>
            <Link
              to={ws.workspaceUrl}
              className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Workspace
            </Link>
            {ws.documentsUrl && (
              <Link to={ws.documentsUrl} className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:underline">
                <FileText className="h-3 w-3" /> Documents
              </Link>
            )}
            {ws.shipmentUrl && (
              <Link to={ws.shipmentUrl} className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:underline">
                <Ship className="h-3 w-3" /> Shipment
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
