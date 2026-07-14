import { useUnreadNotificationCount } from "@/features/notifications/hooks";

const NOTIFICATION_TEST_IDS = new Set([
  "buyer-notifications",
  "supplier-notifications",
  "admin-notifications",
  "sales-notifications",
  "forwarder-notifications",
]);

/** Live badge counts keyed by nav item testId. */
export function useNavBadges(): Record<string, number> {
  const unread = useUnreadNotificationCount();
  if (unread <= 0) return {};

  const badges: Record<string, number> = {};
  for (const id of NOTIFICATION_TEST_IDS) {
    badges[id] = unread;
  }
  return badges;
}
