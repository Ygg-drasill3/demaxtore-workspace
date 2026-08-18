import type { Role } from "@prisma/client";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";

const VIEWER_ROLES = new Set<string>([
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "DOCUMENT_CONTROLLER",
  "SALES_CONTROL",
  "FINANCE_OPERATOR",
  "FORWARDER",
]);

const MANAGER_ROLES = new Set<string>([
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "SALES_CONTROL",
  "DOCUMENT_CONTROLLER",
]);

export function computeAnalyticsPermissions(role: Role | string) {
  const r = String(role);
  const canView = VIEWER_ROLES.has(r) || isPlatformAdminRole(r);
  const canViewSuppliers = MANAGER_ROLES.has(r) || isPlatformAdminRole(r);
  const canExport = isPlatformAdminRole(r) || r === "OPS_MANAGER" || r === "SALES_CONTROL";
  return { canView, canViewSuppliers, canExport };
}
