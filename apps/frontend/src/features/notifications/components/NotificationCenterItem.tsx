import { Link } from "react-router-dom";
import type { NotificationDTO } from "@dmx/contracts/notifications";
import type { SnoozeOption } from "@dmx/contracts/notification-center";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PRIORITY_BADGE,
  PRIORITY_STYLES,
  centerTypeLabel,
} from "../lib/notification-center.utils";
import {
  Bell,
  Clock,
  ExternalLink,
  MessageSquare,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useState } from "react";

interface Props {
  item: NotificationDTO;
  compact?: boolean;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, option: SnoozeOption) => void;
  onNavigate?: () => void;
}

const SNOOZE_OPTIONS: { option: SnoozeOption; label: string }[] = [
  { option: "FIFTEEN_MINUTES", label: "15 min" },
  { option: "ONE_HOUR",        label: "1 hour" },
  { option: "TOMORROW",        label: "Tomorrow" },
  { option: "NEXT_WEEK",       label: "Next week" },
];

export default function NotificationCenterItem({
  item,
  compact,
  onMarkRead,
  onDismiss,
  onSnooze,
  onNavigate,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const priority = item.priority ?? "INFORMATION";
  const isUnread = !item.read && item.status !== "ARCHIVED";

  const primaryHref = item.actions?.find(
    (a) => a.type === "OPEN_CONVERSATION" || a.type === "OPEN_WORKSPACE",
  )?.href ?? item.link;

  return (
    <article
      data-testid={`notification-row-${item.id}`}
      className={cn(
        "border-l-4 rounded-lg border border-paper-200 p-3 sm:p-4 flex gap-3 transition-colors",
        PRIORITY_STYLES[priority],
        isUnread && "ring-1 ring-accent-900/10",
      )}
    >
      <div className="mt-0.5 shrink-0">
        <div className="h-8 w-8 rounded-full bg-paper-100 grid place-items-center text-zinc-500">
          <Bell className="h-4 w-4" />
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className={cn("text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded", PRIORITY_BADGE[priority])}>
                {priority}
              </span>
              {item.centerType && (
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  {centerTypeLabel(item.centerType)}
                </span>
              )}
            </div>
            <h3 className={cn("text-sm text-ink-900 truncate", isUnread && "font-semibold")}>
              {item.title}
            </h3>
          </div>
          <time className="text-[10px] text-zinc-400 shrink-0 whitespace-nowrap">
            {formatRelative(item.createdAt)}
          </time>
        </div>

        {item.body && (
          <p className={cn("text-xs text-zinc-500", compact ? "line-clamp-2" : "line-clamp-3")}>
            {item.body}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          {item.workspaceRef && <span>WS {item.workspaceRef}</span>}
          {item.workspaceType && <span>{item.workspaceType}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {primaryHref && (
            <Link
              to={primaryHref}
              onClick={onNavigate}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-900 hover:underline"
            >
              {item.actions?.some((a) => a.type === "OPEN_CONVERSATION") ? (
                <><MessageSquare className="h-3 w-3" /> Open conversation</>
              ) : (
                <><ExternalLink className="h-3 w-3" /> Open workspace</>
              )}
            </Link>
          )}
          {isUnread && (
            <button
              type="button"
              data-testid={`notification-read-${item.id}`}
              onClick={() => onMarkRead(item.id)}
              className="text-[11px] text-zinc-500 hover:text-ink-900"
            >
              Mark read
            </button>
          )}
          <div className="relative ml-auto">
            <button
              type="button"
              aria-label="More actions"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded hover:bg-paper-100 text-zinc-500"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-lg border border-paper-200 bg-white shadow-lg py-1 text-xs">
                {SNOOZE_OPTIONS.map((s) => (
                  <button
                    key={s.option}
                    type="button"
                    className="w-full px-3 py-1.5 text-left hover:bg-paper-50 flex items-center gap-2"
                    onClick={() => { onSnooze(item.id, s.option); setMenuOpen(false); }}
                  >
                    <Clock className="h-3 w-3" /> Snooze {s.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-paper-50 flex items-center gap-2 text-zinc-600"
                  onClick={() => { onDismiss(item.id); setMenuOpen(false); }}
                >
                  <X className="h-3 w-3" /> Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isUnread && <span className="mt-2 h-2 w-2 rounded-full bg-accent-900 shrink-0" aria-hidden />}
    </article>
  );
}
