// apps/frontend/src/layouts/components/NotificationDrawer.tsx
import { Link } from "react-router-dom";
import { Drawer } from "@/components/ui/Drawer";
import { useUi } from "@/store/ui.store";
import NotificationCenterPanel from "@/features/notifications/components/NotificationCenterPanel";
import { useT } from "@/i18n/useT";

export function NotificationDrawer() {
  const open  = useUi((s) => s.notificationDrawerOpen);
  const close = useUi((s) => s.closeNotifDrawer);
  const { t } = useT();

  return (
    <Drawer
      open={open}
      onClose={close}
      title={t("nc.title")}
      width="md"
      testId="notification-drawer"
    >
      <NotificationCenterPanel compact enabled={open} onNavigate={close} />

      <div className="px-5 py-3 border-t border-paper-200 bg-paper-50/40 mt-auto">
        <Link
          to="/notifications"
          onClick={close}
          data-testid="notification-see-all"
          className="text-sm font-medium text-accent-900 hover:underline"
        >
          {t("nc.seeAll")} →
        </Link>
      </div>
    </Drawer>
  );
}
