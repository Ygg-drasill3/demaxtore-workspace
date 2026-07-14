import type { NotificationCategory } from "@dmx/contracts/notification-center";
import { NOTIFICATION_CATEGORIES } from "../lib/notification-center.utils";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";

interface Props {
  value: NotificationCategory;
  onChange: (c: NotificationCategory) => void;
  unreadCount?: number;
  horizontal?: boolean;
}

export default function NotificationCategoryFilters({
  value,
  onChange,
  unreadCount = 0,
  horizontal,
}: Props) {
  const { t } = useT();

  return (
    <div
      className={cn(
        "flex gap-1.5",
        horizontal
          ? "overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
          : "flex-wrap",
      )}
      role="tablist"
      aria-label="Notification filters"
    >
      {NOTIFICATION_CATEGORIES.map((cat) => {
        const active = value === cat.id;
        const badge = cat.id === "UNREAD" && unreadCount > 0 ? unreadCount : null;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`nc-filter-${cat.id.toLowerCase()}`}
            onClick={() => onChange(cat.id)}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              active ? "bg-ink-950 text-white" : "text-zinc-500 hover:bg-paper-100 hover:text-ink-900",
            )}
          >
            {t(cat.labelKey)}
            {badge != null && (
              <span className={cn("ml-1", active ? "text-white/80" : "text-accent-900")}>
                ({badge})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
