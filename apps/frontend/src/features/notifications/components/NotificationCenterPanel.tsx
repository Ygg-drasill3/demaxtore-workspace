import { useState } from "react";
import type { NotificationCategory } from "@dmx/contracts/notification-center";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import {
  useDismissNotification,
  useMarkAllRead,
  useMarkOneRead,
  useNotifications,
  useSnoozeNotification,
} from "../hooks";
import NotificationCategoryFilters from "./NotificationCategoryFilters";
import NotificationCenterItem from "./NotificationCenterItem";
import { BellRing } from "lucide-react";
import { useT } from "@/i18n/useT";

interface Props {
  compact?: boolean;
  limit?: number;
  enabled?: boolean;
  onNavigate?: () => void;
}

export default function NotificationCenterPanel({
  compact,
  limit = compact ? 20 : 50,
  enabled = true,
  onNavigate,
}: Props) {
  const { t } = useT();
  const [category, setCategory] = useState<NotificationCategory>("ALL");

  const { data, isLoading } = useNotifications({ category, limit, enabled });
  const markAll = useMarkAllRead();
  const markOne = useMarkOneRead();
  const dismiss = useDismissNotification();
  const snooze = useSnoozeNotification();

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col min-h-0" data-testid="notification-center-panel">
      <div className={compact ? "px-4 py-3 border-b border-paper-200 bg-paper-50/50 space-y-3" : "space-y-4"}>
        {!compact && (
          <div>
            <span className="dmx-eyebrow text-zinc-500">{t("nc.eyebrow")}</span>
            <h2 className="font-display text-2xl font-semibold tracking-tight mt-1">
              {t("nc.title")}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">{t("nc.subtitle")}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">
            {data?.unreadCount ?? 0} {t("nc.unread")}
          </span>
          <button
            type="button"
            data-testid="notification-mark-all"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || (data?.unreadCount ?? 0) === 0}
            className="text-xs text-accent-900 font-medium hover:underline disabled:opacity-40"
          >
            {t("notifications.markAllRead")}
          </button>
        </div>

        <NotificationCategoryFilters
          value={category}
          onChange={setCategory}
          unreadCount={data?.unreadCount}
          horizontal
        />
      </div>

      <div className={compact ? "p-3 space-y-2 overflow-y-auto flex-1" : "space-y-3"}>
        {isLoading ? (
          Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
            <div key={i} className="dmx-card p-3 flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BellRing className="h-5 w-5" />}
            title={t("nc.empty.title")}
            body={t("nc.empty.body")}
          />
        ) : (
          items.map((n) => (
            <NotificationCenterItem
              key={n.id}
              item={n}
              compact={compact}
              onMarkRead={(id) => markOne.mutate(id)}
              onDismiss={(id) => dismiss.mutate(id)}
              onSnooze={(id, option) => snooze.mutate({ id, option })}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>
    </div>
  );
}
