// apps/backend/src/realtime/socket.ts
// Phase E — Socket.io with JWT handshake + workspace subscribe ACL.
// Event emission is driven from `socketBus` (see rfq.service.ts post-commit hook).
import { Server as HttpServer } from "node:http";
import { Server as SocketServer, type Socket } from "socket.io";
import { SocketEvents } from "@dmx/contracts";
import { verifyAccessToken } from "../modules/auth/jwt.js";
import { corsOrigins } from "../config/env.js";
import { logger } from "../config/logger.js";
import { canAccessWorkspace } from "../modules/workspace/workspace.policy.js";
import { checkSocketHandshakeLimit } from "../middleware/rate-limit.js";
import { prisma } from "../db/prisma.js";
import type { Role } from "@prisma/client";

interface AuthedSocket extends Socket {
  data: { userId: string; role: Role; email: string };
}

type Ack = (res: { ok: boolean; error?: string }) => void;

import { configureSocketAdapter, getSocketAdapterStatus } from "./socket-adapter.js";

export { getSocketAdapterStatus };

let io: SocketServer | null = null;

export async function initSocket(http: HttpServer): Promise<SocketServer> {
  io = new SocketServer(http, {
    cors:        { origin: corsOrigins, credentials: true },
    path:        "/socket.io",
    serveClient: false,
  });

  // ── Handshake auth: accessToken in `auth.token` or `Authorization: Bearer`. ─
  io.use((socket, next) => {
    const ip = socket.handshake.address ?? "unknown";
    if (!checkSocketHandshakeLimit(ip)) {
      return next(new Error("RATE_LIMITED"));
    }

    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.slice(7)
        : undefined);

    if (!token) return next(new Error("UNAUTHENTICATED"));
    try {
      const payload = verifyAccessToken(token);
      const s = socket as AuthedSocket;
      s.data = { userId: payload.sub, role: payload.role, email: payload.email };
      next();
    } catch {
      next(new Error("UNAUTHENTICATED"));
    }
  });

  io.on("connection", (socket) => {
    const s = socket as AuthedSocket;
    const { userId, role } = s.data;

    // Auto-join personal + role-wide rooms.
    s.join(`user:${userId}`);
    s.join(`role:${role}`);
    logger.info({ userId, role, sid: s.id }, "socket.connected");

    // ── Workspace subscribe (with ACL) ────────────────────────────────────────
    s.on(SocketEvents.WORKSPACE_SUBSCRIBE, async (workspaceId: unknown, ack?: Ack) => {
      if (typeof workspaceId !== "string" || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
        ack?.({ ok: false, error: "INVALID_WORKSPACE_ID" });
        return;
      }
      try {
        const allowed = await canAccessWorkspace(
          prisma,
          { id: userId, role, email: s.data.email },
          workspaceId,
        );
        if (!allowed) {
          ack?.({ ok: false, error: "FORBIDDEN" });
          logger.warn({ userId, workspaceId }, "socket.subscribe.forbidden");
          return;
        }
        await s.join(`workspace:${workspaceId}`);
        ack?.({ ok: true });
        logger.debug({ userId, workspaceId, sid: s.id }, "socket.subscribed");
      } catch (e) {
        logger.error({ err: e, userId, workspaceId }, "socket.subscribe.error");
        ack?.({ ok: false, error: "INTERNAL" });
      }
    });

    s.on(SocketEvents.WORKSPACE_UNSUBSCRIBE, (workspaceId: unknown, ack?: Ack) => {
      if (typeof workspaceId !== "string") return ack?.({ ok: false, error: "INVALID_WORKSPACE_ID" });
      void s.leave(`workspace:${workspaceId}`);
      ack?.({ ok: true });
    });

    s.on("disconnect", (reason) => {
      logger.info({ userId, sid: s.id, reason }, "socket.disconnected");
    });
  });

  await configureSocketAdapter(io);

  return io;
}

export function getIo(): SocketServer {
  if (!io) throw new Error("Socket.io not initialised — call initSocket() first.");
  return io;
}
