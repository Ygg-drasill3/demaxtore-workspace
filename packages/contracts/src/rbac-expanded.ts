// Faz 6 — Expanded RBAC roles and permissions
export const EXPANDED_ROLES = [
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "FINANCE_OPERATOR",
  "DOCUMENT_CONTROLLER",
  "QUALITY_INSPECTOR",
  "FORWARDER",
  "SUPPLIER",
  "BUYER",
  "ADMIN",
] as const;
export type ExpandedRole = (typeof EXPANDED_ROLES)[number];

export const PERMISSIONS = [
  "order:read",
  "order:transition",
  "order:logistics",
  "shipment:read",
  "shipment:milestone",
  "shipment:forwarder_submit",
  "payment:read",
  "payment:manage",
  "document:approve",
  "exception:manage",
  "control_tower:admin",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<ExpandedRole, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: [...PERMISSIONS],
  OPS_MANAGER: ["order:read", "order:transition", "shipment:read", "shipment:milestone", "exception:manage", "control_tower:admin"],
  LOGISTICS_OPERATOR: ["order:read", "shipment:read", "shipment:milestone", "exception:manage"],
  FINANCE_OPERATOR: ["order:read", "payment:read", "payment:manage", "exception:manage"],
  DOCUMENT_CONTROLLER: ["order:read", "shipment:read", "document:approve", "exception:manage"],
  QUALITY_INSPECTOR: ["order:read", "order:transition", "exception:manage"],
  FORWARDER: ["shipment:read", "shipment:forwarder_submit"],
  SUPPLIER: ["order:read", "order:transition"],
  BUYER: ["order:read", "order:transition", "payment:read"],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as ExpandedRole];
  if (!perms) return role === "ADMIN";
  return perms.includes(permission);
}
