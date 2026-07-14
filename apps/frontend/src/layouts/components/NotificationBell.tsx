// apps/frontend/src/layouts/components/NotificationBell.tsx
import { Bell } from "lucide-react";
import { m } from "framer-motion";
import { useUi } from "@/store/ui.store";
import { useUnreadNotificationCount } from "@/features/notifications/hooks";
import { MotionNumber } from "@/motion/primitives/MotionNumber";
import { springMicro } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const open    = useUi((s) => s.openNotifDrawer);
  const count   = useUnreadNotificationCount();
  const reduced = useReducedMotion();

  return (
    <button
      data-testid="notification-bell"
      onClick={open}
      aria-label={`Notifications (${count} unread)`}
      className="relative grid h-9 w-9 place-items-center rounded-lg text-zinc-600 hover:bg-paper-100 hover:text-ink-900 dmx-focus-ring"
    >
      <Bell className="h-4 w-4" />
      <AnimatePresenceBadge count={count} reduced={reduced} />
    </button>
  );
}

function AnimatePresenceBadge({ count, reduced }: { count: number; reduced: boolean }) {
  if (count <= 0) return null;

  return (
    <m.span
      data-testid="notification-bell-count"
      initial={reduced ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduced ? { duration: 0 } : springMicro}
      className={cn(
        "absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1",
        "text-center text-[10px] font-semibold leading-4 text-white",
      )}
    >
      {count > 99 ? "99+" : <MotionNumber value={count} decimals={0} />}
    </m.span>
  );
}
