import React, { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { StatusBadge } from "@/components/common/StatusBadge";

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const load = async () => {
    const { data } = await api.get(`${API_BASE}/notifications`);
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const markOne = async (id) => {
    await api.post(`${API_BASE}/notifications/${id}/read`);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  const markAll = async () => {
    await api.post(`${API_BASE}/notifications/read-all`);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const filtered = filter === "ALL" ? items : items.filter((i) => i.type === filter);

  return (
    <div data-testid="notifications-page" className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="dmx-label">Inbox</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-950 mt-1 flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-zinc-500" /> Notifications
          </h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-xl">
            INFO, SUCCESS, WARNING and ERROR events from across your workspaces.
          </p>
        </div>
        <button
          data-testid="notifications-mark-all"
          onClick={markAll}
          className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium hover:bg-zinc-50"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </header>

      <div className="flex items-center gap-2">
        {["ALL", "INFO", "SUCCESS", "WARNING", "ERROR"].map((f) => (
          <button
            key={f}
            data-testid={`notifications-filter-${f.toLowerCase()}`}
            onClick={() => setFilter(f)}
            className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="dmx-card divide-y divide-zinc-100">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">No notifications.</div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              data-testid={`notif-row-${n.id}`}
              className="p-4 flex items-start gap-4 hover:bg-zinc-50/50 transition-colors"
            >
              <div className="pt-0.5">
                <StatusBadge type={n.type}>{n.type}</StatusBadge>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 truncate">{n.title}</span>
                  {!n.read ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" aria-label="unread" />
                  ) : null}
                </div>
                <p className="text-sm text-zinc-500 mt-0.5">{n.message}</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <span className="text-xs text-zinc-400 whitespace-nowrap">
                  {timeAgo(n.created_at)}
                </span>
                {!n.read ? (
                  <button
                    data-testid={`notif-read-${n.id}`}
                    onClick={() => markOne(n.id)}
                    className="text-xs text-zinc-600 hover:text-zinc-900"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
