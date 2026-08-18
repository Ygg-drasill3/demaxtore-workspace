import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { getSocket } from "@/lib/socket";

const MESSAGING_EVENTS = [
  "messaging:message:new",
  "messaging:message:updated",
  "messaging:message:status",
  "messaging:conversation:read",
  "messaging:conversation:updated",
  "messaging:conversation:assigned",
  "messaging:conversation:archived",
  "messaging:participant:updated",
  "messaging:context:updated",
  "messaging:attachment:created",
] as const;

const seenKeys = new Set<string>();

export function useMessagingSocket(conversationId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    const subscribe = () => {
      socket.emit(SocketEvents.MESSAGING_CONVERSATION_SUBSCRIBE, conversationId);
    };

    subscribe();
    socket.on("connect", subscribe);
    socket.io.on("reconnect", subscribe);

    return () => {
      socket.off("connect", subscribe);
      socket.io.off("reconnect", subscribe);
      socket.emit(SocketEvents.MESSAGING_CONVERSATION_UNSUBSCRIBE, conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onEvent = (payload: { conversationId?: string; idempotencyKey?: string; messageId?: string }) => {
      const key = payload.idempotencyKey ?? `${payload.conversationId}:${payload.messageId ?? ""}`;
      if (key && seenKeys.has(key)) return;
      if (key) {
        seenKeys.add(key);
        setTimeout(() => seenKeys.delete(key), 60_000);
      }
      // Always refresh conversation list; refresh open timeline when event matches.
      void qc.invalidateQueries({ queryKey: ["unified-messages", "conversations"] });
      void qc.invalidateQueries({ queryKey: ["unified-messages", "conversations-infinite"] });
      if (!conversationId || !payload.conversationId || payload.conversationId === conversationId) {
        void qc.invalidateQueries({ queryKey: ["unified-messages"] });
      }
    };

    for (const ev of MESSAGING_EVENTS) {
      socket.on(ev, onEvent);
    }
    return () => {
      for (const ev of MESSAGING_EVENTS) {
        socket.off(ev, onEvent);
      }
    };
  }, [conversationId, qc]);
}
