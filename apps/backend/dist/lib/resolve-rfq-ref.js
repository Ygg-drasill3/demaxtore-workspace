import { AppError } from "../utils/httpErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../db.js";
/** Hex UUID shape (incl. nil / demo seed ids). Not RFC version/variant gated. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function looksLikeUuid(value) {
    return UUID_RE.test(value);
}
/** Resolve RFQ workspace by UUID or public slug. Returns UUID or null. */
export async function resolveRfqWorkspaceId(db, ref) {
    const key = ref.trim();
    if (!key)
        return null;
    if (looksLikeUuid(key)) {
        const byId = await db.workspace.findFirst({
            where: { id: key, type: "RFQ" },
            select: { id: true },
        });
        return byId?.id ?? null;
    }
    const slug = key.toLowerCase();
    const bySlug = await db.workspace.findFirst({
        where: { slug, type: "RFQ" },
        select: { id: true },
    });
    return bySlug?.id ?? null;
}
/**
 * UUID after resolveRfqParam. Prefer this over `req.params.id` on nested mounts —
 * Express can re-merge the original path slug onto `params` after middleware runs.
 */
export function getRfqId(req) {
    const r = req;
    return r.rfqWorkspaceId ?? req.params.id;
}
/** Express middleware: resolve slug → UUID onto `req.rfqWorkspaceId` (+ params.id). */
export const resolveRfqParam = asyncHandler(async (req, _res, next) => {
    const raw = req.params.id;
    if (!raw)
        return next();
    const id = await resolveRfqWorkspaceId(prisma, raw);
    if (!id)
        throw new AppError(404, "RFQ_NOT_FOUND");
    const r = req;
    r.rfqWorkspaceId = id;
    req.params.id = id;
    next();
});
//# sourceMappingURL=resolve-rfq-ref.js.map