// =============================================================================
// @dmx/contracts — Workspace Academy (onboarding, guides, checklist, articles)
// Shared between backend persistence/API and the frontend Academy feature.
// Educational layer only — never mutates commercial state.
// =============================================================================
import { z } from "zod";
import { RoleEnum } from "./auth.js";

export type AcademyRole = z.infer<typeof RoleEnum>;

// ── Guide status ─────────────────────────────────────────────────────────────
export const AcademyGuideStatus = z.enum([
  "NOT_STARTED",
  "STARTED",
  "COMPLETED",
  "DISMISSED",
]);
export type AcademyGuideStatus = z.infer<typeof AcademyGuideStatus>;

// ── Task status ──────────────────────────────────────────────────────────────
export const AcademyTaskStatus = z.enum([
  "LOCKED",
  "AVAILABLE",
  "COMPLETED",
  "DISMISSED",
]);
export type AcademyTaskStatus = z.infer<typeof AcademyTaskStatus>;

// ── Guide registry (ids validated server-side; steps live on the frontend) ──
export const ACADEMY_GUIDE_IDS = [
  // Buyer
  "buyer-dashboard-v1",
  "buyer-inbox-v1",
  "buyer-rfq-list-v1",
  "buyer-rfq-create-v1",
  "buyer-procurement-strategy-v1",
  "buyer-rfq-workspace-v1",
  "buyer-quotation-comparison-v1",
  "buyer-split-award-v1",
  "buyer-proforma-v1",
  "buyer-po-workspace-v1",
  "buyer-order-workspace-v1",
  "buyer-freightiq-v1",
  "buyer-shipment-workspace-v1",
  "buyer-documents-v1",
  "buyer-messages-v1",
  "buyer-alerts-v1",
  "buyer-trade-workspace-v1",
  "buyer-control-tower-v1",
  "buyer-commoditybid-v1",
  // Buyer list / hub pages (sidebar routes — not workspace detail)
  "buyer-commoditybid-list-v1",
  "buyer-mixed-container-v1",
  "buyer-bulk-container-v1",
  "buyer-po-list-v1",
  "buyer-orders-list-v1",
  "buyer-freightiq-hub-v1",
  "buyer-shipments-list-v1",
  "buyer-notifications-v1",
  "buyer-compliance-v1",
  "buyer-learning-v1",
  "buyer-account-v1",
  // Buyer nested / detail pages
  "buyer-commoditybid-panel-v1",
  "buyer-commoditybid-create-v1",
  "buyer-mc-catalog-v1",
  "buyer-mc-catalog-search-v1",
  "buyer-mc-catalog-products-v1",
  "buyer-mc-catalog-product-v1",
  "buyer-mc-requests-v1",
  "buyer-mc-builder-v1",
  "buyer-mc-offer-v1",
  "buyer-mc-organization-v1",
  "buyer-mc-coordination-v1",
  "buyer-bc-catalog-v1",
  "buyer-bc-catalog-products-v1",
  "buyer-bc-requests-v1",
  "buyer-bc-builder-v1",
  "buyer-bc-offer-v1",
  "buyer-bc-coordination-v1",
  "buyer-bc-execution-v1",
  "buyer-shipment-portfolio-v1",
  "buyer-document-detail-v1",
  "buyer-alert-detail-v1",
  "buyer-account-whatsapp-v1",
  "buyer-trade-documents-panel-v1",
  "buyer-messages-thread-v1",
  // Supplier
  "supplier-rfq-list-v1",
  "supplier-quotation-v1",
  "supplier-po-v1",
  "supplier-order-v1",
  "supplier-messages-v1",
  // Operations / Admin
  "ops-rfq-triage-v1",
  "ops-order-v1",
  "ops-shipment-v1",
  "ops-control-tower-v1",
  // Forwarder
  "forwarder-dashboard-v1",
  "forwarder-shipment-v1",
  // Sales control
  "sales-dashboard-v1",
  "sales-control-tower-v1",
] as const;
export type AcademyGuideId = (typeof ACADEMY_GUIDE_IDS)[number];
export const AcademyGuideIdSchema = z.enum(ACADEMY_GUIDE_IDS);

// ── Checklist tasks ──────────────────────────────────────────────────────────
// verification:
//   VIEW   — completes when the user genuinely opens the relevant screen
//            (frontend reports it; backend checks role eligibility only).
//   DOMAIN — backend additionally verifies real domain state before
//            accepting completion (no fake progress possible).
export interface AcademyTaskDefinition {
  id: string;
  roles: readonly AcademyRole[];
  verification: "VIEW" | "DOMAIN";
  /** Task ids that must be COMPLETED before this one unlocks (UI-level). */
  prerequisites?: readonly string[];
}

export const ACADEMY_TASKS: readonly AcademyTaskDefinition[] = [
  // ── BUYER ──
  { id: "buyer_process_overview",        roles: ["BUYER"], verification: "DOMAIN" },
  { id: "buyer_profile_complete",        roles: ["BUYER"], verification: "DOMAIN" },
  { id: "buyer_first_rfq_created",       roles: ["BUYER"], verification: "DOMAIN" },
  { id: "buyer_strategy_selected",       roles: ["BUYER"], verification: "DOMAIN", prerequisites: ["buyer_first_rfq_created"] },
  { id: "buyer_quotation_reviewed",      roles: ["BUYER"], verification: "DOMAIN", prerequisites: ["buyer_first_rfq_created"] },
  { id: "buyer_supplier_selected",       roles: ["BUYER"], verification: "DOMAIN", prerequisites: ["buyer_quotation_reviewed"] },
  { id: "buyer_proforma_reviewed",       roles: ["BUYER"], verification: "DOMAIN", prerequisites: ["buyer_supplier_selected"] },
  { id: "buyer_order_workspace_opened",  roles: ["BUYER"], verification: "DOMAIN", prerequisites: ["buyer_proforma_reviewed"] },
  { id: "buyer_freightiq_explored",      roles: ["BUYER"], verification: "VIEW",   prerequisites: ["buyer_order_workspace_opened"] },
  { id: "buyer_shipment_workspace_opened", roles: ["BUYER"], verification: "DOMAIN", prerequisites: ["buyer_freightiq_explored"] },
  { id: "buyer_document_center_visited", roles: ["BUYER"], verification: "VIEW" },
  { id: "buyer_control_tower_opened",    roles: ["BUYER"], verification: "VIEW" },

  // ── SUPPLIER ──
  { id: "supplier_profile_complete",     roles: ["SUPPLIER"], verification: "DOMAIN" },
  { id: "supplier_invitation_opened",    roles: ["SUPPLIER"], verification: "VIEW" },
  { id: "supplier_quotation_submitted",  roles: ["SUPPLIER"], verification: "DOMAIN", prerequisites: ["supplier_invitation_opened"] },
  { id: "supplier_proforma_uploaded",    roles: ["SUPPLIER"], verification: "VIEW",   prerequisites: ["supplier_quotation_submitted"] },
  { id: "supplier_po_acknowledged",      roles: ["SUPPLIER"], verification: "VIEW",   prerequisites: ["supplier_quotation_submitted"] },
  { id: "supplier_production_updated",   roles: ["SUPPLIER"], verification: "VIEW",   prerequisites: ["supplier_po_acknowledged"] },
  { id: "supplier_document_uploaded",    roles: ["SUPPLIER"], verification: "VIEW" },
  { id: "supplier_messages_opened",      roles: ["SUPPLIER"], verification: "VIEW" },

  // ── OPERATIONS / ADMIN ──
  { id: "ops_rfq_reviewed",              roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER"], verification: "VIEW" },
  { id: "ops_suppliers_assigned",        roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER"], verification: "VIEW", prerequisites: ["ops_rfq_reviewed"] },
  { id: "ops_quotations_managed",        roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER"], verification: "VIEW", prerequisites: ["ops_suppliers_assigned"] },
  { id: "ops_evaluation_completed",      roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER"], verification: "VIEW", prerequisites: ["ops_quotations_managed"] },
  { id: "ops_proforma_managed",          roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER"], verification: "VIEW", prerequisites: ["ops_evaluation_completed"] },
  { id: "ops_po_issued",                 roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER"], verification: "VIEW", prerequisites: ["ops_proforma_managed"] },
  { id: "ops_order_workspace_opened",    roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"], verification: "VIEW" },
  { id: "ops_inspection_coordinated",    roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"], verification: "VIEW" },
  { id: "ops_freightiq_opened",          roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"], verification: "VIEW" },
  { id: "ops_shipment_booked",           roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"], verification: "VIEW" },
  { id: "ops_exception_reviewed",        roles: ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"], verification: "VIEW" },

  // ── FORWARDER ──
  { id: "fwd_requests_opened",           roles: ["FORWARDER"], verification: "VIEW" },
  { id: "fwd_offer_submitted",           roles: ["FORWARDER"], verification: "VIEW", prerequisites: ["fwd_requests_opened"] },
  { id: "fwd_shipment_opened",           roles: ["FORWARDER"], verification: "VIEW" },
  { id: "fwd_documents_opened",          roles: ["FORWARDER"], verification: "VIEW" },
  { id: "fwd_messages_opened",           roles: ["FORWARDER"], verification: "VIEW" },

  // ── SALES_CONTROL ──
  { id: "sales_portfolio_opened",        roles: ["SALES_CONTROL"], verification: "VIEW" },
  { id: "sales_rfq_list_opened",         roles: ["SALES_CONTROL"], verification: "VIEW" },
  { id: "sales_control_tower_opened",    roles: ["SALES_CONTROL"], verification: "VIEW" },
] as const;

export const ACADEMY_TASK_IDS = ACADEMY_TASKS.map((t) => t.id);
export const AcademyTaskIdSchema = z
  .string()
  .refine((v) => ACADEMY_TASK_IDS.includes(v), "Unknown academy task id");

export function academyTasksForRole(role: AcademyRole): AcademyTaskDefinition[] {
  return ACADEMY_TASKS.filter((t) => t.roles.includes(role));
}

export function academyTaskById(id: string): AcademyTaskDefinition | undefined {
  return ACADEMY_TASKS.find((t) => t.id === id);
}

// ── Article ids — kebab-case slug, validated to avoid arbitrary writes ──────
export const AcademyArticleIdSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid article id");

// ── API DTOs ─────────────────────────────────────────────────────────────────
export const AcademyGuideProgressDTO = z.object({
  guideId:       z.string(),
  guideVersion:  z.number().int(),
  status:        AcademyGuideStatus,
  lastStepIndex: z.number().int(),
  displayCount:  z.number().int(),
  startedAt:     z.string().datetime().nullable(),
  completedAt:   z.string().datetime().nullable(),
  dismissedAt:   z.string().datetime().nullable(),
});
export type AcademyGuideProgressDTO = z.infer<typeof AcademyGuideProgressDTO>;

export const AcademyTaskProgressDTO = z.object({
  taskId:      z.string(),
  status:      AcademyTaskStatus,
  completedAt: z.string().datetime().nullable(),
});
export type AcademyTaskProgressDTO = z.infer<typeof AcademyTaskProgressDTO>;

export const AcademyStateDTO = z.object({
  welcomeCompletedAt:          z.string().datetime().nullable(),
  welcomeDismissedAt:          z.string().datetime().nullable(),
  processOverviewCompletedAt:  z.string().datetime().nullable(),
  checklistDismissedAt:        z.string().datetime().nullable(),
  lastAutomaticGuideId:        z.string().nullable(),
  lastAutomaticGuideAt:        z.string().datetime().nullable(),
  guides:                      z.array(AcademyGuideProgressDTO),
  tasks:                       z.array(AcademyTaskProgressDTO),
  recentArticleIds:            z.array(z.string()),
});
export type AcademyStateDTO = z.infer<typeof AcademyStateDTO>;

// ── Request schemas ──────────────────────────────────────────────────────────
export const GuideProgressBody = z.object({
  stepIndex: z.number().int().min(0).max(50),
});
export type GuideProgressBody = z.infer<typeof GuideProgressBody>;
