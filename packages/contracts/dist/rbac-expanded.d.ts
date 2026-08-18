export declare const EXPANDED_ROLES: readonly ["SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER", "QUALITY_INSPECTOR", "FORWARDER", "SUPPLIER", "BUYER", "ADMIN"];
export type ExpandedRole = (typeof EXPANDED_ROLES)[number];
export declare const PERMISSIONS: readonly ["order:read", "order:transition", "order:logistics", "shipment:read", "shipment:milestone", "shipment:forwarder_submit", "payment:read", "payment:manage", "document:approve", "exception:manage", "control_tower:admin"];
export type Permission = (typeof PERMISSIONS)[number];
export declare const ROLE_PERMISSIONS: Record<ExpandedRole, Permission[]>;
export declare function hasPermission(role: string, permission: Permission): boolean;
