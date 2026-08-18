import { Server as SocketServer } from "socket.io";
import { SocketEvents } from "@dmx/contracts";
import { verifyAccessToken } from "../modules/auth/jwt.js";
import { corsOrigins } from "../config/env.js";
import { logger } from "../config/logger.js";
import { canAccessWorkspace } from "../modules/workspace/workspace.policy.js";
import { checkSocketHandshakeLimitAsync } from "../middleware/rate-limit.js";
import { isValidE2eSecretValue } from "../middleware/e2e-bypass.js";
import { prisma } from "../db/prisma.js";
import { configureSocketAdapter, getSocketAdapterStatus } from "./socket-adapter.js";
export { getSocketAdapterStatus };
let io = null;
export async function initSocket(http) {
    io = new SocketServer(http, {
        cors: { origin: corsOrigins, credentials: true },
        path: "/socket.io",
        serveClient: false,
    });
    // ── Handshake auth: accessToken in `auth.token` or `Authorization: Bearer`. ─
    io.use((socket, next) => {
        const e2eSecret = socket.handshake.auth?.e2eSecret;
        if (isValidE2eSecretValue(e2eSecret)) {
            next();
            return;
        }
        const ip = socket.handshake.address ?? "unknown";
        void checkSocketHandshakeLimitAsync(ip).then((ok) => {
            if (!ok)
                return next(new Error("RATE_LIMITED"));
            next();
        }).catch(() => next(new Error("RATE_LIMITED")));
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token ??
            (socket.handshake.headers.authorization?.startsWith("Bearer ")
                ? socket.handshake.headers.authorization.slice(7)
                : undefined);
        if (!token)
            return next(new Error("UNAUTHENTICATED"));
        try {
            const payload = verifyAccessToken(token);
            const s = socket;
            s.data = { userId: payload.sub, role: payload.role, email: payload.email };
            next();
        }
        catch {
            next(new Error("UNAUTHENTICATED"));
        }
    });
    io.on("connection", (socket) => {
        const s = socket;
        const { userId, role } = s.data;
        // Auto-join personal + role-wide rooms.
        s.join(`user:${userId}`);
        s.join(`role:${role}`);
        logger.info({ userId, role, sid: s.id }, "socket.connected");
        // ── Workspace subscribe (with ACL) ────────────────────────────────────────
        s.on(SocketEvents.WORKSPACE_SUBSCRIBE, async (workspaceId, ack) => {
            if (typeof workspaceId !== "string" || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
                ack?.({ ok: false, error: "INVALID_WORKSPACE_ID" });
                return;
            }
            try {
                const allowed = await canAccessWorkspace(prisma, { id: userId, role, email: s.data.email }, workspaceId);
                if (!allowed) {
                    ack?.({ ok: false, error: "FORBIDDEN" });
                    logger.warn({ userId, workspaceId }, "socket.subscribe.forbidden");
                    return;
                }
                await s.join(`workspace:${workspaceId}`);
                ack?.({ ok: true });
                logger.debug({ userId, workspaceId, sid: s.id }, "socket.subscribed");
            }
            catch (e) {
                logger.error({ err: e, userId, workspaceId }, "socket.subscribe.error");
                ack?.({ ok: false, error: "INTERNAL" });
            }
        });
        s.on(SocketEvents.WORKSPACE_UNSUBSCRIBE, (workspaceId, ack) => {
            if (typeof workspaceId !== "string")
                return ack?.({ ok: false, error: "INVALID_WORKSPACE_ID" });
            void s.leave(`workspace:${workspaceId}`);
            ack?.({ ok: true });
        });
        s.on(SocketEvents.MESSAGING_CONVERSATION_SUBSCRIBE, async (conversationId, ack) => {
            if (typeof conversationId !== "string" || !/^[0-9a-f-]{36}$/i.test(conversationId)) {
                ack?.({ ok: false, error: "INVALID_CONVERSATION_ID" });
                return;
            }
            try {
                const { UnifiedMessagingPolicy } = await import("../modules/unified-messaging/unified-messaging.policy.js");
                const policy = new UnifiedMessagingPolicy(prisma);
                const allowed = await policy.canAccessConversation({ id: userId, role, email: s.data.email }, conversationId);
                if (!allowed) {
                    ack?.({ ok: false, error: "FORBIDDEN" });
                    logger.warn({ userId, conversationId }, "socket.messaging.subscribe.forbidden");
                    return;
                }
                await s.join(`messaging:conversation:${conversationId}`);
                ack?.({ ok: true });
                logger.debug({ userId, conversationId, sid: s.id }, "socket.messaging.subscribed");
            }
            catch (e) {
                logger.error({ err: e, userId, conversationId }, "socket.messaging.subscribe.error");
                ack?.({ ok: false, error: "INTERNAL" });
            }
        });
        s.on(SocketEvents.MESSAGING_CONVERSATION_UNSUBSCRIBE, (conversationId, ack) => {
            if (typeof conversationId !== "string")
                return ack?.({ ok: false, error: "INVALID_CONVERSATION_ID" });
            void s.leave(`messaging:conversation:${conversationId}`);
            ack?.({ ok: true });
        });
        s.on("disconnect", (reason) => {
            logger.info({ userId, sid: s.id, reason }, "socket.disconnected");
        });
    });
    await configureSocketAdapter(io);
    const { registerMessagingSocketBridge } = await import("../modules/unified-messaging/messaging-socket.bridge.js");
    registerMessagingSocketBridge(io);
    return io;
}
export function getIo() {
    if (!io)
        throw new Error("Socket.io not initialised — call initSocket() first.");
    return io;
}
//# sourceMappingURL=socket.js.map