// Sprint 12B/12C — Mixed Container FSM

export type MixedContainerState =
  | "MC_DRAFT"
  | "MC_BUILDING"
  | "MC_PRICING_REQUESTED"
  | "MC_PROCUREMENT_IN_PROGRESS"
  | "MC_OFFER_READY"
  | "MC_BUYER_REVIEW"
  | "MC_APPROVED"
  | "MC_ALLOCATION_IN_PROGRESS"
  | "MC_PROFORMA_PENDING"
  | "MC_PAYMENT_TRACKING"
  | "MC_EXECUTION_READY"
  | "MC_EXECUTION_ACTIVE"
  | "MC_EXECUTION_COMPLETE"
  | "MC_REVISION_REQUESTED"
  | "MC_EXPIRED"
  | "MC_CANCELLED";

export type MixedContainerAction =
  | "create_container"
  | "edit_container"
  | "add_product"
  | "update_product_quantity"
  | "remove_product"
  | "request_live_pricing"
  | "cancel_container"
  | "start_procurement"
  | "assign_buyer_manager"
  | "create_offer"
  | "send_offer"
  | "approve_offer"
  | "request_revision"
  | "expire_offer"
  | "regenerate_offer"
  | "resume_procurement"
  | "start_allocation"
  | "create_allocation"
  | "complete_allocations"
  | "upload_proforma"
  | "begin_payment_tracking"
  | "record_payment_sent"
  | "confirm_payment"
  | "mark_execution_ready"
  | "spawn_execution_orders"
  | "mark_execution_complete";

export type McActorRole = "BUYER" | "ADMIN" | "SYSTEM";

export interface MixedContainerTransition {
  from: MixedContainerState | "*";
  to: MixedContainerState;
  action: MixedContainerAction;
  allowedRoles: McActorRole[];
  auditEvent: string;
}

export const MC_TRANSITIONS: MixedContainerTransition[] = [
  { from: "*", to: "MC_DRAFT", action: "create_container", allowedRoles: ["BUYER"], auditEvent: "mixed_container.created" },
  { from: "MC_DRAFT", to: "MC_DRAFT", action: "edit_container", allowedRoles: ["BUYER"], auditEvent: "mixed_container.updated" },
  { from: "MC_DRAFT", to: "MC_BUILDING", action: "add_product", allowedRoles: ["BUYER"], auditEvent: "mixed_container.product_added" },
  { from: "MC_BUILDING", to: "MC_BUILDING", action: "add_product", allowedRoles: ["BUYER"], auditEvent: "mixed_container.product_added" },
  { from: "MC_BUILDING", to: "MC_BUILDING", action: "update_product_quantity", allowedRoles: ["BUYER"], auditEvent: "mixed_container.quantity_updated" },
  { from: "MC_BUILDING", to: "MC_BUILDING", action: "remove_product", allowedRoles: ["BUYER"], auditEvent: "mixed_container.product_removed" },
  { from: "MC_DRAFT", to: "MC_BUILDING", action: "update_product_quantity", allowedRoles: ["BUYER"], auditEvent: "mixed_container.quantity_updated" },
  { from: "MC_DRAFT", to: "MC_BUILDING", action: "remove_product", allowedRoles: ["BUYER"], auditEvent: "mixed_container.product_removed" },
  { from: "MC_BUILDING", to: "MC_BUILDING", action: "edit_container", allowedRoles: ["BUYER"], auditEvent: "mixed_container.updated" },
  { from: "MC_DRAFT", to: "MC_BUILDING", action: "edit_container", allowedRoles: ["BUYER"], auditEvent: "mixed_container.updated" },
  { from: "MC_BUILDING", to: "MC_PRICING_REQUESTED", action: "request_live_pricing", allowedRoles: ["BUYER"], auditEvent: "mixed_container.pricing_requested" },
  { from: "MC_DRAFT", to: "MC_CANCELLED", action: "cancel_container", allowedRoles: ["BUYER"], auditEvent: "mixed_container.cancelled" },
  { from: "MC_BUILDING", to: "MC_CANCELLED", action: "cancel_container", allowedRoles: ["BUYER"], auditEvent: "mixed_container.cancelled" },
  // Sprint 12C — procurement & offer
  { from: "MC_PRICING_REQUESTED", to: "MC_PROCUREMENT_IN_PROGRESS", action: "start_procurement", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.procurement_started" },
  { from: "MC_PRICING_REQUESTED", to: "MC_PRICING_REQUESTED", action: "assign_buyer_manager", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.manager_assigned" },
  { from: "MC_PROCUREMENT_IN_PROGRESS", to: "MC_PROCUREMENT_IN_PROGRESS", action: "assign_buyer_manager", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.manager_assigned" },
  { from: "MC_REVISION_REQUESTED", to: "MC_PROCUREMENT_IN_PROGRESS", action: "resume_procurement", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.procurement_started" },
  { from: "MC_EXPIRED", to: "MC_PROCUREMENT_IN_PROGRESS", action: "regenerate_offer", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.procurement_started" },
  { from: "MC_PROCUREMENT_IN_PROGRESS", to: "MC_OFFER_READY", action: "create_offer", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.offer_created" },
  { from: "MC_OFFER_READY", to: "MC_BUYER_REVIEW", action: "send_offer", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.offer_sent" },
  { from: "MC_PROCUREMENT_IN_PROGRESS", to: "MC_BUYER_REVIEW", action: "send_offer", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.offer_sent" },
  { from: "MC_BUYER_REVIEW", to: "MC_APPROVED", action: "approve_offer", allowedRoles: ["BUYER"], auditEvent: "mixed_container.offer_approved" },
  { from: "MC_BUYER_REVIEW", to: "MC_REVISION_REQUESTED", action: "request_revision", allowedRoles: ["BUYER"], auditEvent: "mixed_container.revision_requested" },
  { from: "MC_BUYER_REVIEW", to: "MC_EXPIRED", action: "expire_offer", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "mixed_container.offer_expired" },
  // Sprint 12D — allocation, proforma & payment coordination
  { from: "MC_APPROVED", to: "MC_ALLOCATION_IN_PROGRESS", action: "start_allocation", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.allocation_started" },
  { from: "MC_ALLOCATION_IN_PROGRESS", to: "MC_ALLOCATION_IN_PROGRESS", action: "create_allocation", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.allocation_created" },
  { from: "MC_ALLOCATION_IN_PROGRESS", to: "MC_PROFORMA_PENDING", action: "complete_allocations", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.allocations_completed" },
  { from: "MC_PROFORMA_PENDING", to: "MC_PROFORMA_PENDING", action: "upload_proforma", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.proforma_uploaded" },
  { from: "MC_PROFORMA_PENDING", to: "MC_PAYMENT_TRACKING", action: "begin_payment_tracking", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "mixed_container.payment_tracking_started" },
  { from: "MC_PAYMENT_TRACKING", to: "MC_PAYMENT_TRACKING", action: "record_payment_sent", allowedRoles: ["BUYER", "ADMIN"], auditEvent: "mixed_container.payment_sent" },
  { from: "MC_PAYMENT_TRACKING", to: "MC_PAYMENT_TRACKING", action: "confirm_payment", allowedRoles: ["ADMIN"], auditEvent: "mixed_container.payment_confirmed" },
  { from: "MC_PAYMENT_TRACKING", to: "MC_EXECUTION_READY", action: "mark_execution_ready", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "smartcontainer.execution_ready" },
  // Sprint 12E — execution bridge into Trade OS
  { from: "MC_EXECUTION_READY", to: "MC_EXECUTION_ACTIVE", action: "spawn_execution_orders", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "smartcontainer.order_spawned" },
  { from: "MC_EXECUTION_ACTIVE", to: "MC_EXECUTION_COMPLETE", action: "mark_execution_complete", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "smartcontainer.execution_completed" },
];

export const MC_TERMINAL_STATES: MixedContainerState[] = ["MC_EXECUTION_COMPLETE", "MC_CANCELLED"];

export const MC_OFFER_VALIDITY_HOURS = 72;

export const MC_CONTAINER_CAPACITIES: Record<string, number> = {
  CONTAINER_20FT: 11,
  CONTAINER_40FT: 24,
  CONTAINER_40FT_HC: 26,
};

export function findMcTransition(from: MixedContainerState, action: MixedContainerAction): MixedContainerTransition | undefined {
  return MC_TRANSITIONS.find((t) => t.from === from && t.action === action);
}

export function isMcTerminal(state: MixedContainerState): boolean {
  return MC_TERMINAL_STATES.includes(state);
}
