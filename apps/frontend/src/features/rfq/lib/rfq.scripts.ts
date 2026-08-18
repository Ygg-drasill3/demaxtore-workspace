// apps/frontend/src/features/rfq/lib/rfq.scripts.ts
//
// THE canonical state → script table (Sprint 2.5 wireframes §6.2).
// Engineering binds state → script; never invents new copy.
// Variable substitutions happen at render time using `formatScript()`.
//
import type { RfqState, RfqAction } from "@dmx/contracts/rfq.fsm";
import { countLinesByStatus, type RfqLineAwardStatus } from "@dmx/contracts/rfq-split-award";

export interface RfqLineForAwardScript {
  id: string;
  awardStatus?: RfqLineAwardStatus | string;
  award?: { supplierUserId?: string; poIssued?: boolean } | null;
}

/** Template vars for PARTIALLY_AWARDED / FULLY_AWARDED hero copy. */
export function rfqAwardScriptVars(
  lineItems: RfqLineForAwardScript[] | undefined | null,
  supplierPoSpawns?: Array<{ supplierUserId?: string }> | null,
): {
  totalLines: number;
  awardedLines: number;
  openLines: number;
  awardedSuppliers: number;
  posIssued: number;
} {
  const lines = lineItems ?? [];
  const counts = countLinesByStatus(
    lines.map((li) => ({
      rfqLineItemId: li.id,
      status: (li.awardStatus ?? "OPEN") as RfqLineAwardStatus,
    })),
  );
  const awardedSupplierIds = new Set(
    lines
      .filter((li) => li.awardStatus === "AWARDED" && li.award?.supplierUserId)
      .map((li) => li.award!.supplierUserId!),
  );
  const posIssued =
    supplierPoSpawns?.length
    ?? [...awardedSupplierIds].filter((id) =>
      lines.some((li) => li.awardStatus === "AWARDED" && li.award?.supplierUserId === id && li.award?.poIssued),
    ).length;

  return {
    totalLines: lines.length,
    awardedLines: counts.AWARDED,
    openLines: counts.OPEN,
    awardedSuppliers: awardedSupplierIds.size,
    posIssued,
  };
}

export type ScriptMood = "active" | "waiting" | "action" | "returned" | "terminal-plus" | "terminal-minus";

export interface RfqScript {
  /** Mood drives card background + accent. */
  mood:           ScriptMood;
  /** Past completed milestone (renders with ✓ glyph). */
  past:           string;
  /** Future / current expectation (renders with → arrow). */
  future:         string;
  /** Left stat card: SLA expectation. */
  statL:          { label: string; value: string };
  /** Right stat card: live progress. */
  statR:          { label: string; value: string };
  /** RfqAction that should render as the embedded primary CTA, or null. */
  primaryAction:  RfqAction | null;
  /** Override label for the primary CTA (defaults to action descriptor label). */
  primaryLabel?:  string;
  /** When primaryAction is null and we still want one fallback button (e.g. Withdraw, Clone). */
  fallbackPrimary?: { label: string; href?: string; action?: RfqAction; tone?: "secondary" | "ghost" };
  /** Secondary actions surfaced inline in the hero card (excluded from More actions). */
  promotedSecondaryActions?: RfqAction[];
}

/**
 * Pass-through template helper. Use {{key}} placeholders in `RFQ_SCRIPTS`,
 * then call formatScript(script, vars) at render time. Missing keys render
 * the placeholder so engineering immediately notices missing data binding.
 */
export function formatScript<T extends Record<string, string | number | null | undefined>>(
  text: string,
  vars: T,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k as keyof T];
    return v == null ? `{{${k}}}` : String(v);
  });
}

const SCRIPT_PLACEHOLDER_RE = /\{\{\w+\}\}/;

/** True when `formatScript` left one or more `{{key}}` tokens unresolved. */
export function hasUnresolvedScriptPlaceholders(text: string): boolean {
  return SCRIPT_PLACEHOLDER_RE.test(text);
}

/** Resolve an internal route href; returns null when placeholders or path are invalid. */
export function resolveScriptHref<T extends Record<string, string | number | null | undefined>>(
  href: string,
  vars: T,
): string | null {
  const resolved = formatScript(href, vars).trim();
  if (!resolved.startsWith("/")) return null;
  if (hasUnresolvedScriptPlaceholders(resolved)) return null;
  return resolved;
}

export const RFQ_SCRIPTS: Record<RfqState, RfqScript> = {
  RFQ_DRAFT: {
    mood: "action",
    past:   "Draft created",
    future: "You need to submit this RFQ to DeMaxtore for supplier matching",
    statL:  { label: "Edit freedom", value: "Free edits before submission" },
    statR:  { label: "Estimated value", value: "{{currency}} {{estimatedValue}}" },
    primaryAction: "submit_rfq",
  },

  RFQ_SUBMITTED: {
    mood: "waiting",
    past:   "RFQ submitted",
    future: "DeMaxtore is reviewing your RFQ and matching verified manufacturers",
    statL:  { label: "Expected completion", value: "Within 1 business day" },
    statR:  { label: "Queue position", value: "#{{queuePosition}}" },
    primaryAction: null,
  },

  REJECTED_BY_ADMIN: {
    mood: "returned",
    past:   "RFQ returned by DeMaxtore",
    future: "Update the highlighted fields and resubmit. See reason below.",
    statL:  { label: "Common reasons", value: "Missing specs · wrong category" },
    statR:  { label: "Suppliers contacted", value: "0 — not yet published" },
    primaryAction: "revise_rejected_rfq",
    primaryLabel: "Revise & Re-submit",
  },

  SUPPLIERS_ASSIGNED: {
    mood: "waiting",
    past:   "{{assignedCount}} suppliers assigned to your RFQ",
    future: "DeMaxtore is finalising the supplier list and will publish shortly",
    statL:  { label: "Review type", value: "Manual review by DeMaxtore" },
    statR:  { label: "Assigned", value: "{{assignedCount}} of typically 4–6" },
    primaryAction: null,
  },

  RFQ_OPEN: {
    mood: "active",
    past:   "RFQ published to {{invited}} suppliers",
    future: "Suppliers are reviewing your RFQ and preparing quotations",
    statL:  { label: "Deadline", value: "{{deadlineCountdown}}" },
    statR:  { label: "Received", value: "{{quoted}}/{{invited}} quotations" },
    primaryAction: "post_clarification",
    primaryLabel: "Post Clarification",
    promotedSecondaryActions: ["close_quotations_early"],
  },

  QUOTATIONS_CLOSED: {
    mood: "action",
    past:   "Quotation window closed",
    future: "{{quoted}} quotations are ready for your review",
    statL:  { label: "Closed", value: "{{closedAt}}" },
    statR:  { label: "Compare", value: "{{quoted}} quotations to compare" },
    primaryAction: "start_evaluation",
  },

  UNDER_EVALUATION: {
    mood: "action",
    past:   "Evaluation started",
    future: "Choose the winning quotation, or close without award",
    statL:  { label: "Bid range",   value: "{{quoted}} bids · {{currency}} {{rangeLow}}–{{rangeHigh}}" },
    statR:  { label: "Selected",    value: "0 selected yet" },
    primaryAction: "select_supplier",
  },

  PARTIALLY_AWARDED: {
    mood: "active",
    past:   "{{awardedLines}} of {{totalLines}} products awarded",
    future: "Award remaining products or issue POs per supplier",
    statL:  { label: "Award progress", value: "{{awardedLines}}/{{totalLines}} lines" },
    statR:  { label: "Open lines", value: "{{openLines}} still open" },
    primaryAction: "issue_supplier_po",
    primaryLabel: "Issue PO",
    promotedSecondaryActions: ["close_rfq_awards"],
    fallbackPrimary: { label: "Open order workspace", href: "/workspace/order/{{orderId}}", tone: "secondary" },
  },

  FULLY_AWARDED: {
    mood: "action",
    past:   "All products resolved",
    future: "Issue purchase orders per supplier",
    statL:  { label: "Suppliers", value: "{{awardedSuppliers}} with awards" },
    statR:  { label: "PO status", value: "{{posIssued}}/{{awardedSuppliers}} POs issued" },
    primaryAction: "issue_supplier_po",
    primaryLabel: "Issue PO",
    promotedSecondaryActions: ["close_rfq_awards"],
    fallbackPrimary: { label: "Open order workspace", href: "/workspace/order/{{orderId}}", tone: "secondary" },
  },

  SUPPLIER_SELECTED: {
    mood: "active",
    past:   "{{selectedSupplier}} selected",
    future: "Request the proforma invoice to lock the order",
    statL:  { label: "Locked bid", value: "{{currency}} {{lockedAmount}}" },
    statR:  { label: "Revert", value: "Possible until proforma requested" },
    primaryAction: "request_proforma",
  },

  PROFORMA_REQUESTED: {
    mood: "waiting",
    past:   "Proforma requested from {{selectedSupplier}}",
    future: "{{selectedSupplier}} is preparing the proforma invoice",
    statL:  { label: "SLA remaining", value: "{{proformaSlaDays}} business days" },
    statR:  { label: "If SLA breaches", value: "RFQ returns to evaluation" },
    primaryAction: null,
  },

  PROFORMA_RECEIVED: {
    mood: "action",
    past:   "Proforma received",
    future: "Review the proforma and approve to proceed to PO",
    statL:  { label: "Total", value: "{{currency}} {{proformaAmount}}" },
    statR:  { label: "Currency", value: "{{currency}} (locked)" },
    primaryAction: "approve_proforma",
  },

  PROFORMA_APPROVED: {
    mood: "action",
    past:   "Proforma approved",
    future: "Issue the Purchase Order to finalise the procurement",
    statL:  { label: "Outcome", value: "PO creates an Order workspace" },
    statR:  { label: "Action type", value: "Final · binding" },
    primaryAction: "issue_po",
  },

  PO_ISSUED: {
    mood: "terminal-plus",
    past:   "PO {{poNumber}} issued",
    future: "Order workspace will activate shortly",
    statL:  { label: "Total", value: "{{currency}} {{poAmount}}" },
    statR:  { label: "Next sprint", value: "Track shipment milestones" },
    primaryAction: null,
    fallbackPrimary: { label: "Open order workspace", href: "/workspace/order/{{orderId}}", tone: "secondary" },
  },

  CLOSED: {
    mood: "terminal-plus",
    past:   "RFQ closed",
    future: "This RFQ is complete.",
    statL:  { label: "Outcome", value: "RFQ closed" },
    statR:  { label: "Status", value: "Complete" },
    primaryAction: null,
    fallbackPrimary: { label: "Open order workspace", href: "/workspace/order/{{orderId}}", tone: "secondary" },
  },

  CANCELLED: {
    mood: "terminal-minus",
    past:   "RFQ cancelled",
    future: "This RFQ is closed. You can clone it to start a new one.",
    statL:  { label: "Cancelled",  value: "{{cancelledAt}}" },
    statR:  { label: "Reason",     value: "{{reason}}" },
    primaryAction: null,
    fallbackPrimary: { label: "Clone RFQ", tone: "secondary" },
  },

  EXPIRED: {
    mood: "terminal-minus",
    past:   "No supplier quoted in time",
    future: "DeMaxtore will reassign or you can revise the timeline",
    statL:  { label: "Original deadline", value: "{{originalDeadline}}" },
    statR:  { label: "Quoted",            value: "0 of {{invited}}" },
    primaryAction: null,
    fallbackPrimary: { label: "Clone RFQ", tone: "secondary" },
  },

  CLOSED_NO_AWARD: {
    mood: "terminal-minus",
    past:   "Closed without selecting a supplier",
    future: "This RFQ is archived. Clone to refine specs or extend supplier list.",
    statL:  { label: "Closed", value: "{{closedAt}}" },
    statR:  { label: "Reason", value: "{{reason}}" },
    primaryAction: null,
    fallbackPrimary: { label: "Clone RFQ", tone: "secondary" },
  },
};

// ---------------------------------------------------------------------------
// Waiting-state 4-section copy (§10) — separate file scope from the hero card.
// Rendered by <WaitingStateCard /> when the workspace is in a pure wait state.
// ---------------------------------------------------------------------------

export interface WaitingScript {
  happening:    string;
  responsible:  string;
  expect:       string[];
  when:         string;
}

export const WAITING_SCRIPTS: Partial<Record<RfqState, WaitingScript>> = {
  RFQ_SUBMITTED: {
    happening: "Your RFQ is in DeMaxtore's review queue. Our sourcing team is matching verified manufacturers in your category and target market.",
    responsible: "DeMaxtore Operations team. You'll see the assigned suppliers within 1 business day. No action required from your side right now.",
    expect: [
      "An email + in-app notification when suppliers are assigned",
      "Typically 4–6 suppliers per RFQ in your category",
      "Average review time: 4 working hours",
    ],
    when: "Within 1 business day. If you don't hear back by {{slaDeadline}}, the DeMaxtore operations team will be automatically alerted.",
  },

  SUPPLIERS_ASSIGNED: {
    happening: "{{assignedCount}} of typically 4–6 suppliers have been assigned to your RFQ. DeMaxtore operations is reviewing the final list before publication.",
    responsible: "DeMaxtore operations. You can request additional suppliers via the clarifications panel below (private to DeMaxtore admin).",
    expect: [
      "The RFQ will be published to all assigned suppliers simultaneously",
      "Suppliers receive an instant email + platform notification",
    ],
    when: "Usually within 2–4 hours of supplier assignment.",
  },

  RFQ_OPEN: {
    happening: "Your RFQ is open to {{invited}} verified suppliers. They have received the spec, attachments, and your deadline. {{viewed}} have already viewed it (see strip above).",
    responsible: "Suppliers — they are preparing their quotations.",
    expect: [
      "First quotations typically arrive within 24–48 hours",
      "Suppliers in {{category}} usually need 2–4 business days to confirm production capacity and pricing",
    ],
    when: "Deadline: {{deadline}}. You can extend (up to 2× / +14 days) or close early.",
  },

  UNDER_EVALUATION: {
    happening: "You have started evaluation. Suppliers can no longer submit new bids. Compare the {{quoted}} quotations in the panel below.",
    responsible: "You — your decision now drives the workflow.",
    expect: [
      "You can select a winner, request more info via clarifications, or close without award",
      "If you need to re-open quotations, only DeMaxtore admin can do that (requires a reason and a new deadline)",
    ],
    when: "There is no platform-imposed deadline for evaluation. However, supplier quotations expire after their stated validity ({{earliestExpiry}} expires first).",
  },

  PROFORMA_REQUESTED: {
    happening: "You have requested a proforma invoice from {{selectedSupplier}}. They are preparing the document with payment terms, banking details, and final commercial conditions.",
    responsible: "{{selectedSupplier}}. The locked bid amount is {{currency}} {{lockedAmount}}.",
    expect: [
      "A proforma invoice file (PDF)",
      "Once received, you can approve to proceed to PO, or request a revision",
      "If you reject too many revisions, the supplier may decline — and you'll return to evaluation",
    ],
    when: "SLA: {{proformaSlaDays}} business days remaining. If the supplier doesn't submit by then, the RFQ automatically returns to evaluation.",
  },

  PROFORMA_RECEIVED: {
    happening: "{{selectedSupplier}} has uploaded their proforma invoice. The proforma file is in the Documents panel.",
    responsible: "You — review the proforma and decide.",
    expect: [
      "Approve → moves to PROFORMA_APPROVED, then you issue the PO",
      "Request revision → returns to supplier with your reason",
      "Cancel → ends the workflow with a reason",
    ],
    when: "There is no platform-imposed deadline, but proformas typically expire in 7–14 days. Check the proforma file's stated validity.",
  },
};

// ---------------------------------------------------------------------------
// Supplier perspective — avoids buyer copy on the same workspace states.
// ---------------------------------------------------------------------------

export const SUPPLIER_RFQ_SCRIPTS: Partial<Record<RfqState, RfqScript>> = {
  SUPPLIERS_ASSIGNED: {
    mood: "waiting",
    past:   "You were invited to this RFQ",
    future: "DeMaxtore will publish the RFQ to suppliers — the quotation form unlocks when status is Open",
    statL:  { label: "Your status", value: "Invited · awaiting publish" },
    statR:  { label: "Quote deadline", value: "{{deadlineCountdown}}" },
    primaryAction: null,
  },
  RFQ_OPEN: {
    mood: "action",
    past:   "RFQ is open for your quotation",
    future: "Use the Submit your quotation form below — price each line, set lead time, then submit",
    statL:  { label: "Deadline", value: "{{deadlineCountdown}}" },
    statR:  { label: "Competing suppliers", value: "{{invited}} invited" },
    primaryAction: null,
  },
  QUOTATIONS_CLOSED: {
    mood: "waiting",
    past:   "Quotation window closed",
    future: "The buyer is reviewing all bids. You can no longer submit or revise.",
    statL:  { label: "Your submission", value: "See your quotation below if you submitted" },
    statR:  { label: "Closed", value: "{{closedAt}}" },
    primaryAction: null,
  },
  PROFORMA_REQUESTED: {
    mood: "action",
    past:   "The buyer requested your proforma invoice",
    future: "Upload your proforma PDF — payment terms and banking details on the document",
    statL:  { label: "SLA", value: "{{proformaSlaDays}} business days left" },
    statR:  { label: "Locked bid", value: "{{currency}} {{lockedAmount}}" },
    primaryAction: "submit_proforma",
    primaryLabel: "Submit proforma",
  },
};

export const SUPPLIER_WAITING_SCRIPTS: Partial<Record<RfqState, WaitingScript>> = {
  SUPPLIERS_ASSIGNED: {
    happening: "DeMaxtore assigned you to this RFQ. The buyer's spec and attachments are visible here, but quotations are not open yet.",
    responsible: "DeMaxtore operations — they publish the RFQ to all invited suppliers at once.",
    expect: [
      "You will get email + in-app notification when the RFQ opens",
      "The quotation form on this page appears only when status is RFQ Open",
    ],
    when: "Usually within a few hours after assignment. No action needed until publish.",
  },
  RFQ_OPEN: {
    happening: "This RFQ is open. Scroll to Submit your quotation, enter unit prices per line, optional lead time and payment terms, then click Submit quotation.",
    responsible: "You — only assigned suppliers (Counterparty) can submit a bid.",
    expect: [
      "You may revise your bid until the buyer closes quotations or the deadline passes",
      "You can post clarifications in the panel below if specs are unclear",
    ],
    when: "Deadline: {{deadline}}. After close you cannot change your offer.",
  },
  PROFORMA_REQUESTED: {
    happening: "You won this RFQ. The buyer is waiting for your proforma invoice (PDF) with final commercial terms.",
    responsible: "You — upload the proforma file, then confirm submission.",
    expect: [
      "Use Submit proforma (hero button or More actions) to open the upload dialog",
      "PDF only; you can reuse a file already uploaded under Documents",
    ],
    when: "SLA: {{proformaSlaDays}} business days. After expiry the RFQ may return to buyer evaluation.",
  },
};

export type WorkspaceScriptRole = "BUYER" | "SUPPLIER" | "ADMIN";

/** Admin operations desk — distinct from buyer waiting copy. */
export const ADMIN_RFQ_SCRIPTS: Partial<Record<RfqState, RfqScript>> = {
  RFQ_SUBMITTED: {
    mood: "action",
    past:   "RFQ submitted by buyer",
    future: "Assign verified suppliers, then publish when the list is ready",
    statL:  { label: "Your action", value: "Assign suppliers" },
    statR:  { label: "Queue", value: "Review queue" },
    primaryAction: "assign_suppliers",
    primaryLabel: "Assign suppliers",
  },
  SUPPLIERS_ASSIGNED: {
    mood: "action",
    past:   "{{assignedCount}} suppliers assigned",
    future: "Publish to open quotations — suppliers receive instant notification",
    statL:  { label: "Assigned", value: "{{assignedCount}} suppliers" },
    statR:  { label: "Next", value: "Publish RFQ" },
    primaryAction: "publish_rfq",
    primaryLabel: "Publish RFQ",
    promotedSecondaryActions: ["return_to_review"],
  },
  RFQ_OPEN: {
    mood: "action",
    past:   "RFQ published to suppliers",
    future: "Monitor supplier activity or roll back if published prematurely",
    statL:  { label: "Received", value: "{{quoted}}/{{invited}} quotations" },
    statR:  { label: "Deadline", value: "{{deadlineCountdown}}" },
    primaryAction: null,
    promotedSecondaryActions: ["unpublish_rfq", "extend_deadline", "reopen_quotations"],
  },
  QUOTATIONS_CLOSED: {
    mood: "action",
    past:   "Quotation window closed",
    future: "Buyer evaluates — or reopen / roll back evaluation if needed",
    statL:  { label: "Quotations", value: "{{quoted}} received" },
    statR:  { label: "Admin", value: "Workflow control" },
    primaryAction: "reopen_quotations",
    primaryLabel: "Reopen quotations",
  },
  UNDER_EVALUATION: {
    mood: "action",
    past:   "Buyer is evaluating quotations",
    future: "Revert to quotes closed if evaluation started too early",
    statL:  { label: "Quotations", value: "{{quoted}} to compare" },
    statR:  { label: "Admin", value: "Workflow control" },
    primaryAction: null,
    promotedSecondaryActions: ["revert_evaluation", "reopen_quotations"],
  },
};

export function rfqScriptFor(state: RfqState, role: WorkspaceScriptRole): RfqScript | undefined {
  if (role === "ADMIN" && ADMIN_RFQ_SCRIPTS[state]) return ADMIN_RFQ_SCRIPTS[state];
  if (role === "SUPPLIER" && SUPPLIER_RFQ_SCRIPTS[state]) return SUPPLIER_RFQ_SCRIPTS[state];
  return RFQ_SCRIPTS[state];
}

/** Actions rendered in the hero card — excluded from the More actions drawer. */
export function rfqHeroActions(state: RfqState, role: WorkspaceScriptRole): RfqAction[] {
  const script = rfqScriptFor(state, role) ?? RFQ_SCRIPTS[state];
  const actions: RfqAction[] = [];
  if (script?.primaryAction) actions.push(script.primaryAction);
  if (script?.promotedSecondaryActions?.length) actions.push(...script.promotedSecondaryActions);
  return actions;
}

export function waitingScriptFor(state: RfqState, role: WorkspaceScriptRole): WaitingScript | undefined {
  if (role === "SUPPLIER" && SUPPLIER_WAITING_SCRIPTS[state]) return SUPPLIER_WAITING_SCRIPTS[state];
  return WAITING_SCRIPTS[state];
}
