// apps/frontend/src/layouts/components/NotificationDrawer.tsx
import { Link } from "react-router-dom";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { useUi } from "@/store/ui.store";
import { useNotifications, useMarkAllRead, useMarkOneRead } from "@/features/notifications/hooks";
import { formatRelative } from "@/lib/utils";
import { BellRing } from "lucide-react";

export function NotificationDrawer() {
  const open  = useUi((s) => s.notificationDrawerOpen);
  const close = useUi((s) => s.closeNotifDrawer);
  const { data, isLoading } = useNotifications({ limit: 30, enabled: open });
  const markAll = useMarkAllRead();
  const markOne = useMarkOneRead();

  const items = data?.items ?? [];

  return (
    <Drawer open={open} onClose={close} title="Notifications" width="md" testId="notification-drawer">
      <div className="px-5 py-3 border-b border-paper-200 flex items-center justify-between bg-paper-50/50">
        <div className="text-xs text-zinc-500">{data?.unreadCount ?? 0} unread</div>
        <button data-testid="notification-mark-all"
                onClick={() => markAll.mutate()} disabled={markAll.isPending || (data?.unreadCount ?? 0) === 0}
                className="text-xs text-accent-900 font-medium hover:underline disabled:opacity-40">
          Mark all read
        </button>
      </div>

      <div className="p-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dmx-card p-3 flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState icon={<BellRing className="h-5 w-5" />} title="You're all caught up"
                      body="Updates on quotes, orders, shipments and alerts appear here." />
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              data-testid={`notification-row-${n.id}`}
              className="dmx-card dmx-card-hover p-3 flex gap-3 items-start"
            >
              <StatusBadge type={n.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm text-ink-900 font-medium truncate">{n.title}</div>
                  <div className="text-[10px] text-zinc-400 shrink-0">{formatRelative(n.createdAt)}</div>
                </div>
                {n.body && <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</div>}
                <div className="flex items-center gap-3 mt-1.5">
                  {n.link && (
                    <Link to={n.link} onClick={close} className="text-[11px] text-accent-900 font-medium hover:underline">
                      View details →
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      data-testid={`notification-read-${n.id}`}
                      onClick={() => markOne.mutate(n.id)}
                      className="text-[11px] text-zinc-500 hover:text-ink-900"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-accent-900 shrink-0" />}
            </div>
          ))
        )}
      </div>

      <div className="px-5 py-3 border-t border-paper-200 bg-paper-50/40">
        <Link
          to="/notifications"
          onClick={close}
          data-testid="notification-see-all"
          className="text-sm font-medium text-accent-900 hover:underline"
        >
          See all notifications →
        </Link>
      </div>
    </Drawer>
  );
}
