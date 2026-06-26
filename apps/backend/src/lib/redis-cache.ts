// Redis cache helpers — multi-instance shared cache preparation.
import { getRedisClient } from "./redis.js";

const DEFAULT_TTL_SEC = 300;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  const raw = await redis.get(`cache:${key}`);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSec = DEFAULT_TTL_SEC): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(`cache:${key}`, JSON.stringify(value), { EX: ttlSec });
}

export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(`cache:${key}`);
}
