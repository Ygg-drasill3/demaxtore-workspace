import { AppError } from "../../../utils/httpErrors.js";
export function assertAdminCommercial(actor) {
    if (actor.role !== "ADMIN")
        throw new AppError(403, "FORBIDDEN_ROLE");
}
export function canViewOfferCommercial(actor) {
    return actor.role === "ADMIN";
}
//# sourceMappingURL=freight-commercial.policy.js.map