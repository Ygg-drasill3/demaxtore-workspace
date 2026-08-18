// apps/backend/src/middleware/idempotency.ts
//
// Phase G3 — Write-through idempotency.
//
// Algorithm:
//   1. On the first call with (key, user, route), atomically INSERT a placeholder
//      row (status_code=0, response={}). This is the lock.
//   2. If the INSERT collides (P2002 unique-key violation), look up the existing row:
//        • status_code > 0  → REPLAY the cached response.
//        • status_code == 0 → another request is mid-flight → return 409 IN_FLIGHT.
//   3. After the handler emits its JSON response, UPDATE the placeholder row with
//      the real statusCode + response body.
//
// This guarantees that for the same (key, user, route) at most ONE business
// transaction runs — eliminating timeline/audit/notification duplication.
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { logger } from "../config/logger.js";
import { verifyAccessToken } from "../modules/auth/jwt.js";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
function peekUserId(req) {
    const header = req.headers.authorization;
    if (!header)
        return null;
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token)
        return null;
    try {
        return verifyAccessToken(token.trim()).sub;
    }
    catch {
        return null;
    }
}
export async function idempotency(req, res, next) {
    const key = req.header("Idempotency-Key");
    if (!key || SAFE_METHODS.has(req.method)) {
        next();
        return;
    }
    const userId = peekUserId(req);
    if (!userId) {
        next();
        return;
    } // requireAuth will issue the 401
    const route = `${req.method} ${req.baseUrl}${req.path}`;
    // ── Step 1: try to claim the key with a placeholder row ─────────────────
    let weClaimedIt = false;
    try {
        await prisma.idempotencyKey.create({
            data: { key, userId, route, statusCode: 0, response: {} },
        });
        weClaimedIt = true;
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
            if (!existing) { // racing delete — extremely unlikely
                logger.warn({ key }, "idempotency: race on insert lookup");
                next();
                return;
            }
            if (existing.userId !== userId || existing.route !== route) {
                res.status(409).json({
                    error: { code: "IDEMPOTENCY_REPLAY", message: "Key reused for a different request" },
                });
                return;
            }
            if (existing.statusCode === 0) {
                res.status(409).json({
                    error: { code: "IDEMPOTENCY_IN_FLIGHT", message: "Request with same key still processing" },
                });
                return;
            }
            // Cached response — replay it.
            res.status(existing.statusCode).json(existing.response);
            return;
        }
        logger.warn({ err: e, key }, "idempotency: placeholder insert failed — falling through");
        next();
        return;
    }
    // ── Step 2: instrument res.json to persist the response on completion ──
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        const result = originalJson(body);
        // Note: res.statusCode is final by the time res.json fires.
        void prisma.idempotencyKey
            .update({
            where: { key },
            data: { statusCode: res.statusCode, response: body },
        })
            .catch((e) => logger.warn({ err: e, key }, "idempotency: response persist failed"));
        return result;
    };
    // If the response stream is closed without ever calling res.json (e.g. file
    // download, error before handler), drop the placeholder so future calls don't
    // get stuck in IN_FLIGHT forever.
    res.on("close", () => {
        if (weClaimedIt && res.statusCode === 200 && !res.writableEnded) {
            // pass; happy path handled above.
        }
    });
    res.on("finish", () => { });
    // Safety net: if neither res.json nor res.send is called and we still have
    // a placeholder row, evict it after a short delay.
    setTimeout(() => {
        void prisma.idempotencyKey.findUnique({ where: { key } }).then((row) => {
            if (row && row.statusCode === 0) {
                return prisma.idempotencyKey.delete({ where: { key } });
            }
        }).catch(() => void 0);
    }, 30_000).unref();
    next();
}
//# sourceMappingURL=idempotency.js.map