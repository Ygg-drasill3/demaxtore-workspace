import { AppError } from "../../utils/httpErrors.js";
/** Sprint 7B — growth APIs are admin-only (operations uses ADMIN role). */
export function assertGrowthAccess(user) {
    if (!user)
        throw new AppError(401, "UNAUTHORIZED");
    if (user.role !== "ADMIN")
        throw new AppError(403, "FORBIDDEN_ROLE");
}
export function denyNonAdmin(res) {
    return false;
}
//# sourceMappingURL=growth.policy.js.map