// Redis cache helpers — multi-instance shared cache preparation.
import { getRedisClient } from "./redis.js";
const DEFAULT_TTL_SEC = 300;
export async function cacheGet(key) {
    const redis = await getRedisClient();
    const raw = await redis.get(`cache:${key}`);
    if (!raw)
        return null;
    return JSON.parse(raw);
}
export async function cacheSet(key, value, ttlSec = DEFAULT_TTL_SEC) {
    const redis = await getRedisClient();
    await redis.set(`cache:${key}`, JSON.stringify(value), { EX: ttlSec });
}
export async function cacheDel(key) {
    const redis = await getRedisClient();
    await redis.del(`cache:${key}`);
}
//# sourceMappingURL=redis-cache.js.map