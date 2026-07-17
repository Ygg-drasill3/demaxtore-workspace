import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { getRedisClient } from "../../lib/redis.js";

const DEFAULT_TTL_SEC = 86_400;

function hashKey(scope: string, key: string): string {
  return createHash("sha256").update(`${scope}:${key}`).digest("hex").slice(0, 40);
}

/** Distributed idempotency: Redis SET NX first, PostgreSQL unique fallback. */
export class MessagingDedupStore {
  constructor(private readonly prisma: PrismaClient) {}

  async claim(scope: string, key: string, ttlSec = DEFAULT_TTL_SEC): Promise<boolean> {
    const keyHash = hashKey(scope, key);
    const redisKey = `messaging:dedup:${keyHash}`;

    try {
      const redis = await getRedisClient();
      const set = await redis.set(redisKey, "1", { NX: true, EX: ttlSec });
      if (set === null) return false;
    } catch {
      /* Redis unavailable — fall through to DB */
    }

    const expiresAt = new Date(Date.now() + ttlSec * 1000);
    try {
      await this.prisma.messagingIdempotencyKey.create({
        data: { scope, keyHash, expiresAt },
      });
      return true;
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
      if (code === "P2002") return false;
      throw e;
    }
  }

  async has(scope: string, key: string): Promise<boolean> {
    const keyHash = hashKey(scope, key);
    try {
      const redis = await getRedisClient();
      const hit = await redis.get(`messaging:dedup:${keyHash}`);
      if (hit) return true;
    } catch {
      /* fall through */
    }
    const row = await this.prisma.messagingIdempotencyKey.findUnique({
      where: { keyHash },
      select: { expiresAt: true },
    });
    return Boolean(row && row.expiresAt > new Date());
  }
}

let store: MessagingDedupStore | null = null;

export function getMessagingDedupStore(prisma: PrismaClient): MessagingDedupStore {
  if (!store) store = new MessagingDedupStore(prisma);
  return store;
}

export function resetMessagingDedupStoreForTests() {
  store = null;
}
