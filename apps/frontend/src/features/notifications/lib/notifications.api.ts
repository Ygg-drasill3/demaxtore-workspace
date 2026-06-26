// apps/frontend/src/features/notifications/lib/notifications.api.ts
import { api } from "@/lib/api";
import type { NotificationListResponse, ListNotificationsQuery } from "@dmx/contracts/notifications";

export const notificationsApi = {
  list:        (q?: Partial<ListNotificationsQuery>) =>
    api.get<NotificationListResponse>("/notifications", { params: q }).then((r) => r.data),

  unreadCount: () =>
    api.get<{ count: number }>("/notifications/unread-count").then((r) => r.data),

  markRead:    (id: string) =>
    api.post(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.post("/notifications/read-all").then((r) => r.data),
};
