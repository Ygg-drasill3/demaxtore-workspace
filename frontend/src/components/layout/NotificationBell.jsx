import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/common/StatusBadge";

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get(`${API_BASE}/notifications`);
      setItems(data || []);
    } catch (_) {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const markAll = async (e) => {
    e?.stopPropagation?.();
    try {
      await api.post(`${API_BASE}/notifications/read-all`);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    } catch (_) {
      /* ignore */
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="notification-bell"
          className="relative h-9 w-9 rounded-lg border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-zinc-700" />
          {unread > 0 ? (
            <span
              data-testid="notification-unread-count"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[360px] p-0 overflow-hidden"
        data-testid="notification-dropdown"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-zinc-900">
            Notifications
          </DropdownMenuLabel>
          <button
            data-testid="notification-mark-all"
            onClick={markAll}
            className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              You're all caught up.
            </div>
          ) : (
            items.slice(0, 6).map((n) => (
              <div
                key={n.id}
                data-testid={`notification-item-${n.id}`}
                className="px-4 py-3 border-b last:border-b-0 border-zinc-100 hover:bg-zinc-50/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge type={n.type}>{n.type}</StatusBadge>
                      {!n.read ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" aria-label="unread" />
                      ) : null}
                    </div>
                    <div className="mt-1.5 text-sm font-medium text-zinc-900 truncate">
                      {n.title}
                    </div>
                    <div className="text-xs text-zinc-500 line-clamp-2">{n.message}</div>
                  </div>
                  <div className="text-[11px] text-zinc-400 shrink-0">
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          data-testid="notification-view-all"
          className="px-4 py-2.5 text-sm cursor-pointer justify-center"
          onSelect={(e) => {
            e.preventDefault();
            setOpen(false);
            navigate("/notifications");
          }}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
