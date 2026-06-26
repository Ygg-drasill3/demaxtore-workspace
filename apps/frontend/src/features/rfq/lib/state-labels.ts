// apps/frontend/src/features/rfq/lib/state-labels.ts
//
// Single source of truth for buyer-readable language.
// FSM state names never leak to the UI — they pass through this map first.
// Lifted verbatim from /app/docs/sprint-2.5-ux-redesign-wireframes.md §5 + §6.2.
//
import type { RfqState } from "@dmx/contracts/rfq.fsm";

/** Compact label used by RfqStateBadge and storyline tooltips. */
export const STATE_LABEL: Record<RfqState, string> = {
  RFQ_DRAFT:           "Draft",
  RFQ_SUBMITTED:       "Under review by DeMaxtore",
  REJECTED_BY_ADMIN:   "Returned for revision",
  SUPPLIERS_ASSIGNED:  "Verified manufacturers selected",
  RFQ_OPEN:            "Waiting for supplier quotations",
  QUOTATIONS_CLOSED:   "Quotations closed — ready for review",
  UNDER_EVALUATION:    "Reviewing quotations",
  SUPPLIER_SELECTED:   "Supplier selected",
  PROFORMA_REQUESTED:  "Awaiting proforma",
  PROFORMA_RECEIVED:   "Proforma ready for review",
  PROFORMA_APPROVED:   "Proforma approved — ready for PO",
  PO_ISSUED:           "Order placed",
  CLOSED:              "Completed",
  CANCELLED:           "Cancelled",
  EXPIRED:             "Expired",
  CLOSED_NO_AWARD:     "Closed — no award",
};

/** Storyline step indices (7 steps) for the renamed progress bar. */
export const STATE_TO_STORYLINE_STEP: Record<RfqState, number> = {
  RFQ_DRAFT:           0,
  RFQ_SUBMITTED:       1,
  REJECTED_BY_ADMIN:   1, // sits at the review step until resubmitted
  SUPPLIERS_ASSIGNED:  2,
  RFQ_OPEN:            3,
  QUOTATIONS_CLOSED:   4,
  UNDER_EVALUATION:    4,
  SUPPLIER_SELECTED:   5,
  PROFORMA_REQUESTED:  5,
  PROFORMA_RECEIVED:   5,
  PROFORMA_APPROVED:   5,
  PO_ISSUED:           6,
  CLOSED:              6,
  CANCELLED:           -1,
  EXPIRED:             -1,
  CLOSED_NO_AWARD:     -1,
};

export const STORYLINE_STEPS = [
  { key: "draft",     label: "Draft" },
  { key: "review",    label: "Under review" },
  { key: "inviting",  label: "Inviting suppliers" },
  { key: "collect",   label: "Collecting quotations" },
  { key: "evaluate",  label: "Reviewing quotations" },
  { key: "proforma",  label: "Awaiting proforma" },
  { key: "order",     label: "Order placed" },
] as const;

/** Storyline sub-state pill copy. */
export function storylineSubLabel(args: {
  state:    RfqState;
  invited:  number;
  quoted:   number;
  assignedSuppliers?: number;
  proformaSlaDaysLeft?: number;
}): string | null {
  switch (args.state) {
    case "SUPPLIERS_ASSIGNED":
      return args.assignedSuppliers != null
        ? `${args.assignedSuppliers} of typically 4–6 suppliers`
        : null;
    case "RFQ_OPEN":
      return `${args.quoted} of ${args.invited} quotations submitted`;
    case "QUOTATIONS_CLOSED":
    case "UNDER_EVALUATION":
      return `${args.quoted} quotations to compare`;
    case "PROFORMA_REQUESTED":
      return args.proformaSlaDaysLeft != null
        ? `Proforma due in ${args.proformaSlaDaysLeft} business days`
        : null;
    default:
      return null;
  }
}

export function terminalReason(state: RfqState): string | null {
  switch (state) {
    case "CANCELLED":       return "This RFQ was cancelled.";
    case "EXPIRED":         return "Closed — no supplier quoted before the deadline.";
    case "CLOSED_NO_AWARD": return "Closed without selecting a supplier.";
    case "CLOSED":          return "Order fulfilled — this RFQ is complete.";
    default:                return null;
  }
}
