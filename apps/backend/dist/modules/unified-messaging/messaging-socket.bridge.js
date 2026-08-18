import { logger } from "../../config/logger.js";
/** Maps legacy socket events to unified messaging namespace (Phase 7 bridge). */
export function registerMessagingSocketBridge(io) {
    io.on("connection", (socket) => {
        const bridge = (legacyEvent, unifiedEvent) => {
            socket.on(legacyEvent, (payload) => {
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
export function emitMessagingEvent(io, event, room, payload) {
    io.to(room).emit(event, payload);
}
//# sourceMappingURL=messaging-socket.bridge.js.map