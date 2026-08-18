/** Mirrors backend partner-workspace.policy canManagePartnerAssignments. */
const MANAGER_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "SALES_CONTROL",
  "DOCUMENT_CONTROLLER",
]);

export function canManagePartnerAssignments(role?: string | null): boolean {
  return !!role && MANAGER_ROLES.has(role);
}
