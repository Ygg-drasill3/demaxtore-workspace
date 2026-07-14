// apps/frontend/src/features/notifications/pages/NotificationsPage.tsx
import NotificationCenterPanel from "../components/NotificationCenterPanel";

export default function NotificationsPage() {
  return (
    <div data-testid="notifications-page" className="max-w-4xl mx-auto pb-10 animate-fade-in">
      <NotificationCenterPanel limit={80} />
    </div>
  );
}
