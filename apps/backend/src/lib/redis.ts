// Shared Redis client — rate limiting, brute-force, cache, socket adapter.
import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient> | null = null;

export function redisUrl(): string | undefined {
  return env.REDIS_URL?.trim() || undefined;
}

export async function getRedisClient(): Promise<RedisClient> {
  const url = redisUrl();
  if (!url) throw new Error("REDIS_URL_NOT_CONFIGURED");

  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      const c = createClient({ url });
      c.on("error", (err) => logger.error({ err }, "redis.client.error"));
      await c.connect();
      client = c;
      logger.info({ url: url.replace(/:[^:@]+@/, ":***@") }, "redis.connected");
      return c;
    })().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }

  return connectPromise;
}

export async function closeRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
    client = null;
    connectPromise = null;
  }
}

/** Increment a sliding-window counter. Returns current count after increment. */
export async function redisIncrWindow(
  key: string,
  windowSec: number,
): Promise<number> {
  const redis = await getRedisClient();
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return count;
}
