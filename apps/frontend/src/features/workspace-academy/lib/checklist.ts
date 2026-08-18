// apps/frontend/src/features/workspace-academy/lib/checklist.ts
//
// UI metadata for the role-based onboarding checklists. Task ids, roles and
// verification rules are defined once in @dmx/contracts/workspace-academy;
// this file only adds labels, routes and unlock hints.
//
// VIEW tasks auto-complete when the user genuinely opens the mapped route
// (see ROUTE_TASK_TRIGGERS). DOMAIN tasks are verified server-side against
// real commercial data before completion is accepted.
import type { Role } from "@dmx/contracts/auth";
import { academyTasksForRole } from "@dmx/contracts/workspace-academy";
import type { ChecklistTaskUI } from "../types/academy.types";

const UI: Record<string, Omit<ChecklistTaskUI, "id">> = {
  // ── BUYER ──
  buyer_process_overview:          { titleKey: "wa.task.buyerProcess", route: "/help/getting-started" },
  buyer_profile_complete:          { titleKey: "wa.task.buyerProfile", route: "/settings/account", lockedHintKey: "wa.task.hint.profile" },
  buyer_first_rfq_created:         { titleKey: "wa.task.buyerRfq", route: "/buyer/rfq/new" },
  buyer_strategy_selected:         { titleKey: "wa.task.buyerStrategy", lockedHintKey: "wa.task.hint.afterRfq" },
  buyer_quotation_reviewed:        { titleKey: "wa.task.buyerQuote", lockedHintKey: "wa.task.hint.afterQuote" },
  buyer_supplier_selected:         { titleKey: "wa.task.buyerAward", lockedHintKey: "wa.task.hint.afterQuote" },
  buyer_proforma_reviewed:         { titleKey: "wa.task.buyerProforma", lockedHintKey: "wa.task.hint.afterAward" },
  buyer_order_workspace_opened:    { titleKey: "wa.task.buyerOrder", lockedHintKey: "wa.task.hint.afterPo" },
  buyer_freightiq_explored:        { titleKey: "wa.task.buyerFreight", lockedHintKey: "wa.task.hint.afterPo" },
  buyer_shipment_workspace_opened: { titleKey: "wa.task.buyerShipment", lockedHintKey: "wa.task.hint.afterBooking" },
  buyer_document_center_visited:   { titleKey: "wa.task.buyerDocs", route: "/documents" },
  buyer_control_tower_opened:      { titleKey: "wa.task.buyerCt", route: "/buyer/control-tower" },

  // ── SUPPLIER ──
  supplier_profile_complete:       { titleKey: "wa.task.supProfile", route: "/settings/account" },
  supplier_invitation_opened:      { titleKey: "wa.task.supInvite", route: "/supplier/rfq" },
  supplier_quotation_submitted:    { titleKey: "wa.task.supQuote", lockedHintKey: "wa.task.hint.afterInvite" },
  supplier_proforma_uploaded:      { titleKey: "wa.task.supProforma", lockedHintKey: "wa.task.hint.afterQuoteSub" },
  supplier_po_acknowledged:        { titleKey: "wa.task.supPo", lockedHintKey: "wa.task.hint.afterQuoteSub" },
  supplier_production_updated:     { titleKey: "wa.task.supProduction", lockedHintKey: "wa.task.hint.afterPoAck" },
  supplier_document_uploaded:      { titleKey: "wa.task.supDoc" },
  supplier_messages_opened:        { titleKey: "wa.task.supMsg", route: "/messages" },

  // ── OPERATIONS ──
  ops_rfq_reviewed:                { titleKey: "wa.task.opsRfq", route: "/admin/rfq" },
  ops_suppliers_assigned:          { titleKey: "wa.task.opsAssign", lockedHintKey: "wa.task.hint.opsAfterReview" },
  ops_quotations_managed:          { titleKey: "wa.task.opsQuote", lockedHintKey: "wa.task.hint.opsAfterAssign" },
  ops_evaluation_completed:        { titleKey: "wa.task.opsEval", lockedHintKey: "wa.task.hint.opsAfterQuote" },
  ops_proforma_managed:            { titleKey: "wa.task.opsProforma", lockedHintKey: "wa.task.hint.opsAfterEval" },
  ops_po_issued:                   { titleKey: "wa.task.opsPo", lockedHintKey: "wa.task.hint.opsAfterProforma" },
  ops_order_workspace_opened:      { titleKey: "wa.task.opsOrder" },
  ops_inspection_coordinated:      { titleKey: "wa.task.opsInspection" },
  ops_freightiq_opened:            { titleKey: "wa.task.opsFreight" },
  ops_shipment_booked:             { titleKey: "wa.task.opsBook" },
  ops_exception_reviewed:          { titleKey: "wa.task.opsException", route: "/alerts" },

  // ── FORWARDER ──
  fwd_requests_opened:             { titleKey: "wa.task.fwdRequests", route: "/forwarder/dashboard" },
  fwd_offer_submitted:             { titleKey: "wa.task.fwdOffer", lockedHintKey: "wa.task.hint.fwdAfterRequests" },
  fwd_shipment_opened:             { titleKey: "wa.task.fwdShipment" },
  fwd_documents_opened:            { titleKey: "wa.task.fwdDocs", route: "/documents" },
  fwd_messages_opened:             { titleKey: "wa.task.fwdMsg", route: "/messages" },

  // ── SALES ──
  sales_portfolio_opened:          { titleKey: "wa.task.salesPortfolio", route: "/sales/dashboard" },
  sales_rfq_list_opened:           { titleKey: "wa.task.salesRfq", route: "/sales/rfq" },
  sales_control_tower_opened:      { titleKey: "wa.task.salesCt", route: "/sales/control-tower" },
};

export interface ChecklistItem extends ChecklistTaskUI {
  prerequisites: readonly string[];
  verification: "VIEW" | "DOMAIN";
}

export function checklistForRole(role: Role): ChecklistItem[] {
  return academyTasksForRole(role).map((def) => ({
    id: def.id,
    prerequisites: def.prerequisites ?? [],
    verification: def.verification,
    ...(UI[def.id] ?? { titleKey: `wa.task.${def.id}` }),
  }));
}

/**
 * Route → task-ids that complete when the user genuinely opens that screen.
 * DOMAIN tasks in this map are still verified server-side — the request is
 * simply an attempt; the backend rejects it if the real event hasn't happened.
 */
export const ROUTE_TASK_TRIGGERS: readonly { pattern: string; tasks: readonly string[] }[] = [
  { pattern: "/documents",              tasks: ["buyer_document_center_visited", "fwd_documents_opened"] },
  { pattern: "/buyer/control-tower",    tasks: ["buyer_control_tower_opened"] },
  { pattern: "/workspace/order/:id",    tasks: ["buyer_order_workspace_opened", "ops_order_workspace_opened"] },
  { pattern: "/workspace/shipment/:id", tasks: ["buyer_shipment_workspace_opened", "fwd_shipment_opened"] },
  { pattern: "/workspace/rfq/:id",      tasks: ["buyer_quotation_reviewed", "supplier_invitation_opened"] },
  { pattern: "/workspace/rfq/:id/procurement-strategy", tasks: ["buyer_strategy_selected"] },
  { pattern: "/buyer/rfq",              tasks: ["buyer_first_rfq_created"] },
  { pattern: "/admin/rfq",              tasks: ["ops_rfq_reviewed"] },
  { pattern: "/messages",               tasks: ["supplier_messages_opened", "fwd_messages_opened"] },
  { pattern: "/alerts",                 tasks: ["ops_exception_reviewed"] },
  { pattern: "/forwarder/dashboard",    tasks: ["fwd_requests_opened"] },
  { pattern: "/sales/dashboard",        tasks: ["sales_portfolio_opened"] },
  { pattern: "/sales/rfq",              tasks: ["sales_rfq_list_opened"] },
  { pattern: "/sales/control-tower",    tasks: ["sales_control_tower_opened"] },
  { pattern: "/settings/account",       tasks: ["buyer_profile_complete", "supplier_profile_complete"] },
];
