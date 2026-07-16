// apps/backend/src/realtime/socket-bus.ts
// Post-commit emit queue used by the RFQ service.
//
// Inside a Prisma $transaction the service calls `socketBus.scheduleEmit(fn)`.
// `fn` is dispatched via `setImmediate` so it fires AFTER the transaction
// promise resolves (i.e. after commit), keeping event ordering consistent
// with DB state.
import type { Server as SocketServer } from "socket.io";
import { getIo } from "./socket.js";
import { logger } from "../config/logger.js";
import type { Role } from "@prisma/client";

function io(): SocketServer | null {
  try {
    return getIo();
  } catch {
    // initSocket() not called yet (e.g. unit tests) — drop quietly.
    return null;
  }
}

export const socketBus = {
  /** Defer `fn` until the current transaction commits. */
  scheduleEmit(fn: () => void): void {
    setImmediate(() => {
      try { fn(); } catch (e) { logger.error({ err: e }, "socketBus emit failed"); }
    });
  },

  emitToWorkspace(workspaceId: string, event: string, payload: unknown): void {
    io()?.to(`workspace:${workspaceId}`).emit(event, payload);
  },

  emitToUser(userId: string, event: string, payload: unknown): void {
    io()?.to(`user:${userId}`).emit(event, payload);
  },

  emitToRole(role: Role, event: string, payload: unknown): void {
    io()?.to(`role:${role}`).emit(event, payload);
  },

  emitToRoom(room: string, event: string, payload: unknown): void {
    io()?.to(room).emit(event, payload);
  },
};
