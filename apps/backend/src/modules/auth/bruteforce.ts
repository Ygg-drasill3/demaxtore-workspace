// Redis-backed brute-force guard (5 failed attempts → 15 min lockout per ip+email).
import { redisIncrWindow, redisUrl, getRedisClient } from "../../lib/redis.js";
import { logger } from "../../config/logger.js";

const MAX_ATTEMPTS = 5;
const LOCK_SEC = 15 * 60;
const ATTEMPT_TTL_SEC = 60 * 60;

const key = (ip: string, email: string): string => `bf:${ip}:${email.toLowerCase()}`;

export async function checkLock(ip: string, email: string): Promise<{ locked: boolean; retryInSec: number }> {
  if (!redisUrl()) {
    logger.error("bruteforce.redis_missing");
    return { locked: false, retryInSec: 0 };
  }

  try {
    const redis = await getRedisClient();
    const k = key(ip, email);
    const raw = await redis.get(k);
    if (!raw) return { locked: false, retryInSec: 0 };

    const [countStr, lockUntilStr] = raw.split(":");
    const lockUntil = Number(lockUntilStr ?? 0);
    const now = Date.now();
    if (lockUntil > now) {
      return { locked: true, retryInSec: Math.ceil((lockUntil - now) / 1000) };
    }
    void countStr;
    return { locked: false, retryInSec: 0 };
  } catch (err) {
    logger.error({ err }, "bruteforce.check_error");
    return { locked: false, retryInSec: 0 };
  }
}

export async function recordFailure(ip: string, email: string): Promise<void> {
  if (!redisUrl()) return;

  try {
    const redis = await getRedisClient();
    const k = key(ip, email);
    const raw = await redis.get(k);
    const prevCount = raw ? Number(raw.split(":")[0] ?? 0) : 0;
    const count = prevCount + 1;
    const lockUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCK_SEC * 1000 : 0;
    await redis.set(k, `${count}:${lockUntil}`, { EX: ATTEMPT_TTL_SEC });
  } catch (err) {
    logger.error({ err }, "bruteforce.record_failure_error");
  }
}

export async function recordSuccess(ip: string, email: string): Promise<void> {
  if (!redisUrl()) return;
  try {
    const redis = await getRedisClient();
    await redis.del(key(ip, email));
  } catch (err) {
    logger.error({ err }, "bruteforce.record_success_error");
  }
}

/** No-op — Redis TTL handles expiry. */
export function pruneExpired(): void {}
