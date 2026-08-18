import { createHash } from "node:crypto";
import { getRedisClient } from "../../lib/redis.js";
const DEFAULT_TTL_SEC = 86_400;
function hashKey(scope, key) {
    return createHash("sha256").update(`${scope}:${key}`).digest("hex").slice(0, 40);
}
/** Distributed idempotency: Redis SET NX first, PostgreSQL unique fallback. */
export class MessagingDedupStore {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async claim(scope, key, ttlSec = DEFAULT_TTL_SEC) {
        const keyHash = hashKey(scope, key);
        const redisKey = `messaging:dedup:${keyHash}`;
        try {
            const redis = await getRedisClient();
            const set = await redis.set(redisKey, "1", { NX: true, EX: ttlSec });
            if (set === null)
                return false;
        }
        catch {
            /* Redis unavailable — fall through to DB */
        }
        const expiresAt = new Date(Date.now() + ttlSec * 1000);
        try {
            await this.prisma.messagingIdempotencyKey.create({
                data: { scope, keyHash, expiresAt },
            });
            return true;
        }
        catch (e) {
            const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
            if (code === "P2002")
                return false;
            throw e;
        }
    }
    async has(scope, key) {
        const keyHash = hashKey(scope, key);
        try {
            const redis = await getRedisClient();
            const hit = await redis.get(`messaging:dedup:${keyHash}`);
            if (hit)
                return true;
        }
        catch {
            /* fall through */
        }
        const row = await this.prisma.messagingIdempotencyKey.findUnique({
            where: { keyHash },
            select: { expiresAt: true },
        });
        return Boolean(row && row.expiresAt > new Date());
    }
}
let store = null;
export function getMessagingDedupStore(prisma) {
    if (!store)
        store = new MessagingDedupStore(prisma);
    return store;
}
export function resetMessagingDedupStoreForTests() {
    store = null;
}
//# sourceMappingURL=messaging-dedup.store.js.map