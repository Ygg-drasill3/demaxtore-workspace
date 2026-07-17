import type { Server as SocketServer } from "socket.io";
import { logger } from "../../config/logger.js";

/** Maps legacy socket events to unified messaging namespace (Phase 7 bridge). */
export function registerMessagingSocketBridge(io: SocketServer) {
  io.on("connection", (socket) => {
    const bridge = (legacyEvent: string, unifiedEvent: string) => {
      socket.on(legacyEvent, (payload: unknown) => {
        socket.emit(unifiedEvent, payload);
      });
    };

    bridge("chat:message:new", "messaging:message:new");
    bridge("whatsapp:message:new", "messaging:message:new");
    bridge("whatsapp:message:status", "messaging:message:status");
    bridge("whatsapp:conversation:updated", "messaging:conversation:updated");
    bridge("COMMUNICATION_CREATED", "messaging:message:new");
    bridge("COMMUNICATION_UPDATED", "messaging:message:updated");
    bridge("COMMUNICATION_READ", "messaging:conversation:read");
  });

  logger.info("Messaging socket compatibility bridge registered");
}

export function emitMessagingEvent(
  io: SocketServer,
  event:
    | "messaging:conversation:new"
    | "messaging:conversation:updated"
    | "messaging:message:new"
    | "messaging:message:updated"
    | "messaging:message:status"
    | "messaging:conversation:read"
    | "messaging:conversation:assigned"
    | "messaging:conversation:archived",
  room: string,
  payload: Record<string, unknown>,
) {
  io.to(room).emit(event, payload);
}
