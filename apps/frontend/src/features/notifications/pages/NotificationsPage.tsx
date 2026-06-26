// apps/frontend/src/features/notifications/pages/NotificationsPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { useNotifications, useMarkAllRead, useMarkOneRead } from "../hooks";
import { formatRelative } from "@/lib/utils";
import { BellRing } from "lucide-react";
import { useT } from "@/i18n/useT";
import { translateNotificationTitle } from "../lib/translateNotification";

export default function NotificationsPage() {
  const { t } = useT();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications({ unreadOnly, limit: 50 });
  const markAll = useMarkAllRead();
  const markOne = useMarkOneRead();

  const items = data?.items ?? [];

  return (
    <div data-testid="notifications-page" className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("notifications.eyebrow")}</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">{t("notifications.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="dmx-card p-1 flex items-center text-xs">
            <button data-testid="notif-filter-all"      onClick={() => setUnreadOnly(false)}
                    className={"px-2.5 py-1 rounded-md " + (!unreadOnly ? "bg-ink-950 text-white" : "text-zinc-500")}>{t("notifications.filter.all")}</button>
            <button data-testid="notif-filter-unread"   onClick={() => setUnreadOnly(true)}
                    className={"px-2.5 py-1 rounded-md " + (unreadOnly ? "bg-ink-950 text-white" : "text-zinc-500")}>{t("notifications.filter.unread")}</button>
          </div>
          <Button variant="secondary" size="md" data-testid="notif-mark-all"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending || (data?.unreadCount ?? 0) === 0}>
            {t("notifications.markAllRead")}
          </Button>
        </div>
      </header>

      <Card className="divide-y divide-paper-200">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="p-2">
            <EmptyState icon={<BellRing className="h-5 w-5" />} title={unreadOnly ? t("notifications.empty.unread") : t("notifications.empty.all")}
                        body={t("notifications.empty.body")} />
          </div>
        ) : items.map((n) => (
          <div key={n.id} data-testid={`notif-row-${n.id}`} className="px-5 py-4 flex gap-4 items-start">
            <StatusBadge type={n.type} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-medium text-ink-900 truncate">{translateNotificationTitle(t, n.title, n.titleKey)}</div>
                <div className="text-[11px] text-zinc-400 shrink-0">{formatRelative(n.createdAt)}</div>
              </div>
              {n.body && <div className="text-xs text-zinc-500 mt-0.5">{n.body}</div>}
              <div className="flex items-center gap-3 mt-1.5">
                {n.link && <Link to={n.link} className="text-[11px] text-accent-900 font-medium hover:underline">{t("notifications.openWorkspace")}</Link>}
                {!n.read && (
                  <button data-testid={`notif-read-${n.id}`} onClick={() => markOne.mutate(n.id)}
                          className="text-[11px] text-zinc-500 hover:text-ink-900">{t("notifications.markRead")}</button>
                )}
              </div>
            </div>
            {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-accent-900 shrink-0" />}
          </div>
        ))}
      </Card>
    </div>
  );
}
