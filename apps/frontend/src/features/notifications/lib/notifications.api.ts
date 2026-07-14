// apps/frontend/src/features/notifications/lib/notifications.api.ts
import { api } from "@/lib/api";
import type {
  NotificationListResponse,
  ListNotificationsQuery,
  NotificationPreferences,
  SnoozeOption,
} from "@dmx/contracts/notifications";

export const notificationsApi = {
  list: (q?: Partial<ListNotificationsQuery>) =>
    api.get<NotificationListResponse>("/notifications", { params: q }).then((r) => r.data),

  unreadCount: () =>
    api.get<{ count: number }>("/notifications/unread-count").then((r) => r.data),

  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.post("/notifications/read-all").then((r) => r.data),

  archive: (id: string) =>
    api.post(`/notifications/${id}/archive`).then((r) => r.data),

  dismiss: (id: string) =>
    api.post(`/notifications/${id}/dismiss`).then((r) => r.data),

  snooze: (id: string, option: SnoozeOption) =>
    api.post(`/notifications/${id}/snooze`, { option }).then((r) => r.data),

  getPreferences: () =>
    api.get<NotificationPreferences>("/notifications/preferences").then((r) => r.data),

  putPreferences: (prefs: NotificationPreferences) =>
    api.put<NotificationPreferences>("/notifications/preferences", prefs).then((r) => r.data),
};
