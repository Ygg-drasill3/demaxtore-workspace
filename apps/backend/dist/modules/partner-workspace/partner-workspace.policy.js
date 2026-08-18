import { isPartnerRole, partnerHasCapability } from "@dmx/contracts/partner-workspace";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
export function resolvePartnerRole(actor) {
    if (isPartnerRole(actor.role))
        return actor.role;
    return null;
}
export function assertPartnerCapability(role, cap) {
    if (!partnerHasCapability(role, cap)) {
        const err = new Error("FORBIDDEN");
        err.status = 403;
        err.code = "PARTNER_CAPABILITY_DENIED";
        throw err;
    }
}
export function canManagePartnerAssignments(role) {
    return (isPlatformAdminRole(role)
        || role === "OPS_MANAGER"
        || role === "LOGISTICS_OPERATOR"
        || role === "SALES_CONTROL"
        || role === "DOCUMENT_CONTROLLER");
}
/** Fields stripped from partner-facing shipment/order summaries. */
export const PARTNER_REDACTED_KEYS = new Set([
    "margin",
    "marginPct",
    "internalMargin",
    "landedCost",
    "internalNotes",
    "costBreakdown",
    "buyPrice",
    "sellPrice",
    "commission",
    "profit",
]);
export function redactForPartner(input) {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
        if (PARTNER_REDACTED_KEYS.has(k))
            continue;
        if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
            out[k] = redactForPartner(v);
        }
        else {
            out[k] = v;
        }
    }
    return out;
}
//# sourceMappingURL=partner-workspace.policy.js.map