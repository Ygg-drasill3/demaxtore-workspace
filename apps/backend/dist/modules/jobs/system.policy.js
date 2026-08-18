import { AppError } from "../../utils/httpErrors.js";
export function assertSystemAccess(user) {
    if (!user)
        throw new AppError(401, "UNAUTHORIZED");
    if (user.role !== "ADMIN")
        throw new AppError(403, "FORBIDDEN_ROLE");
}
//# sourceMappingURL=system.policy.js.map