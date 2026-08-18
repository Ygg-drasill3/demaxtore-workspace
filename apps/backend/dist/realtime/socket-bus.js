import { getIo } from "./socket.js";
import { logger } from "../config/logger.js";
function io() {
    try {
        return getIo();
    }
    catch {
        // initSocket() not called yet (e.g. unit tests) — drop quietly.
        return null;
    }
}
export const socketBus = {
    /** Defer `fn` until the current transaction commits. */
    scheduleEmit(fn) {
        setImmediate(() => {
            try {
                fn();
            }
            catch (e) {
                logger.error({ err: e }, "socketBus emit failed");
            }
        });
    },
    emitToWorkspace(workspaceId, event, payload) {
        io()?.to(`workspace:${workspaceId}`).emit(event, payload);
    },
    emitToUser(userId, event, payload) {
        io()?.to(`user:${userId}`).emit(event, payload);
    },
    emitToRole(role, event, payload) {
        io()?.to(`role:${role}`).emit(event, payload);
    },
    emitToRoom(room, event, payload) {
        io()?.to(room).emit(event, payload);
    },
};
//# sourceMappingURL=socket-bus.js.map