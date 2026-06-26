// apps/frontend/src/layouts/components/NotificationBell.tsx
import { Bell } from "lucide-react";
import { useUi } from "@/store/ui.store";
import { useUnreadNotificationCount } from "@/features/notifications/hooks";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const open  = useUi((s) => s.openNotifDrawer);
  const count = useUnreadNotificationCount();

  return (
    <button
      data-testid="notification-bell"
      onClick={open}
      aria-label={`Notifications (${count} unread)`}
      className="relative h-9 w-9 rounded-lg text-zinc-600 hover:bg-paper-100 hover:text-ink-900 grid place-items-center dmx-focus-ring"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span
          data-testid="notification-bell-count"
          className={cn(
            "absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1",
            "rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4 text-center",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
