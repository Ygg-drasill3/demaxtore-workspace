// Shared Redis client — rate limiting, brute-force, cache, socket adapter.
import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
let client = null;
let connectPromise = null;
export function redisUrl() {
    return env.REDIS_URL?.trim() || undefined;
}
export async function getRedisClient() {
    const url = redisUrl();
    if (!url)
        throw new Error("REDIS_URL_NOT_CONFIGURED");
    if (client?.isOpen)
        return client;
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
export async function closeRedis() {
    if (client?.isOpen) {
        await client.quit();
        client = null;
        connectPromise = null;
    }
}
/** Increment a sliding-window counter. Returns current count after increment. */
export async function redisIncrWindow(key, windowSec) {
    const redis = await getRedisClient();
    const count = await redis.incr(key);
    if (count === 1)
        await redis.expire(key, windowSec);
    return count;
}
/** Read a window's current count without consuming budget. */
export async function redisWindowCount(key) {
    const redis = await getRedisClient();
    const raw = await redis.get(key);
    const parsed = raw === null ? 0 : parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}
//# sourceMappingURL=redis.js.map