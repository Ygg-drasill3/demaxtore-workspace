// apps/frontend/src/features/notifications/hooks.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect } from "react";
import { notificationsApi } from "./lib/notifications.api";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@dmx/contracts/socket-events";
import type { NotificationNewPayload } from "@dmx/contracts/socket-events";
import type { ListNotificationsQuery } from "@dmx/contracts/notifications";
import { useAuth } from "@/store/auth.store";
import { useToast } from "@/store/toast.store";

const KEY_LIST  = (q: Partial<ListNotificationsQuery>) => ["notifications", "list", q] as const;
const KEY_COUNT = ["notifications", "unread-count"] as const;

export function useNotifications(q: Partial<ListNotificationsQuery> & { enabled?: boolean } = {}) {
  const { enabled = true, ...query } = q;
  return useQuery({
    queryKey: KEY_LIST(query),
    queryFn:  () => notificationsApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUnreadNotificationCount(): number {
  const status = useAuth((s) => s.status);
  const qc = useQueryClient();
  const enabled = status === "authenticated";

  const { data } = useQuery({
    queryKey: KEY_COUNT,
    queryFn:  () => notificationsApi.unreadCount(),
    enabled,
    staleTime: 30_000,
  });

  // Subscribe to personal channel for live count updates.
  useEffect(() => {
    if (!enabled) return;
    const sock = getSocket();
    const onNew = (p: NotificationNewPayload) => {
      qc.setQueryData<{ count: number }>(KEY_COUNT, (old) => ({ count: (old?.count ?? 0) + 1 }));
      qc.invalidateQueries({ queryKey: ["notifications", "list"] });
      useToast.getState().push({
        type: p.notification.type,
        title: p.notification.title,
        body:  p.notification.body ?? undefined,
      });
    };
    sock.on(SocketEvents.NOTIFICATION_NEW, onNew);
    return () => { sock.off(SocketEvents.NOTIFICATION_NEW, onNew); };
  }, [enabled, qc]);

  return data?.count ?? 0;
}

export function useMarkOneRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.setQueryData<{ count: number }>(KEY_COUNT, { count: 0 });
      qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    },
  });
}
