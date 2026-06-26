// Socket.io adapter — memory (default) or Redis for multi-instance.
import type { Server as SocketServer } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export type SocketAdapterKind = "memory" | "redis";

let adapterKind: SocketAdapterKind = "memory";
let redisConnected = false;

export function getSocketAdapterStatus(): { adapter: SocketAdapterKind; redisConnected: boolean } {
  return { adapter: adapterKind, redisConnected };
}

export async function configureSocketAdapter(io: SocketServer): Promise<void> {
  if (env.SOCKET_ADAPTER !== "redis") {
    adapterKind = "memory";
    // H1 safeguard: PM2 sets NODE_APP_INSTANCE per cluster worker. A non-zero
    // value means we are running in a multi-instance cluster, where the in-memory
    // adapter silently drops cross-instance realtime events.
    const clusterInstance = Number(process.env.NODE_APP_INSTANCE ?? "0");
    if (Number.isFinite(clusterInstance) && clusterInstance > 0) {
      logger.error(
        { clusterInstance },
        "Socket.io in-memory adapter running in a multi-instance cluster — realtime events WILL be dropped across instances. Set SOCKET_ADAPTER=redis + REDIS_URL or run a single instance.",
      );
    } else {
      logger.info("Socket.io using in-memory adapter");
    }
    return;
  }

  if (!env.REDIS_URL) {
    logger.warn("SOCKET_ADAPTER=redis but REDIS_URL missing — falling back to memory");
    adapterKind = "memory";
    return;
  }

  try {
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const { createClient } = await import("redis");
    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();
    pubClient.on("error", (err) => logger.error({ err }, "redis.pub.error"));
    subClient.on("error", (err) => logger.error({ err }, "redis.sub.error"));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    adapterKind = "redis";
    redisConnected = true;
    logger.info({ url: env.REDIS_URL.replace(/:[^:@]+@/, ":***@") }, "Socket.io Redis adapter connected");
  } catch (err) {
    adapterKind = "memory";
    redisConnected = false;
    logger.warn({ err }, "Redis adapter init failed — using memory adapter");
  }
}
