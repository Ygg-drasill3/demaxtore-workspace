/** Staff roles with portfolio-wide read access (not full admin ops). */
export function hasPortfolioVisibility(role) {
    return role === "ADMIN" || role === "SALES_CONTROL" || role === "SUPER_ADMIN";
}
/** Full admin platform ops (RFQ triage, workflow rollback, supplier assign). */
export function isPlatformAdminRole(role) {
    return role === "ADMIN" || role === "SUPER_ADMIN";
}
/** Map platform roles to RFQ FSM actor roles (SUPER_ADMIN ≡ ADMIN). */
export function effectiveRfqFsmRole(role) {
    if (role === "SUPER_ADMIN")
        return "ADMIN";
    return role;
}
//# sourceMappingURL=staff-roles.js.map