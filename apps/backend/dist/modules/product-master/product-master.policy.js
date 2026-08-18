import { AppError } from "../../utils/httpErrors.js";
const MANAGER_ROLES = new Set(["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"]);
export function canManageProducts(user) {
    return MANAGER_ROLES.has(String(user.role));
}
export function canBrowseProducts(user) {
    return canManageProducts(user);
}
/** Partner / supplier roles must not browse Product Master. */
export function isProductMasterDeniedRole(user) {
    const r = String(user.role);
    return (r === "SUPPLIER" ||
        r === "ORIGIN_AGENT" ||
        r === "CUSTOMS_BROKER" ||
        r === "TRUCKER" ||
        r === "FORWARDER");
}
export async function resolveActorOrganisationId(prisma, user, overrideOrgId) {
    if (overrideOrgId && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
        return overrideOrgId;
    }
    const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organisationId: true },
    });
    return row?.organisationId ?? null;
}
export async function assertProductAccess(prisma, user, productId) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, organisationId: true },
    });
    if (!product)
        throw new AppError(404, "PRODUCT_NOT_FOUND");
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
        return product;
    const orgId = await resolveActorOrganisationId(prisma, user);
    if (!orgId || orgId !== product.organisationId) {
        throw new AppError(403, "PRODUCT_FORBIDDEN");
    }
    return product;
}
//# sourceMappingURL=product-master.policy.js.map