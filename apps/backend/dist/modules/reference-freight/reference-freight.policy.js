import { REFERENCE_FREIGHT_ADMIN_ROLES } from "@dmx/contracts/reference-freight";
export const REFERENCE_FREIGHT_ALLOWED_ROLES = [
    ...REFERENCE_FREIGHT_ADMIN_ROLES,
];
export function canManageReferenceFreight(role) {
    return REFERENCE_FREIGHT_ALLOWED_ROLES.includes(role);
}
//# sourceMappingURL=reference-freight.policy.js.map