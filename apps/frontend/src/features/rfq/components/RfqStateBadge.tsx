// apps/frontend/src/features/rfq/components/RfqStateBadge.tsx
//
// Sprint 2.5: buyer-readable labels from state-labels.ts (no FSM language).
//
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { STATE_LABEL, STATE_LIST_LABEL } from "../lib/state-labels";
import type { RfqState } from "@dmx/contracts/rfq.fsm";

const STATE_TONE: Record<RfqState, BadgeTone> = {
  RFQ_DRAFT:           "neutral",
  RFQ_SUBMITTED:       "info",
  REJECTED_BY_ADMIN:   "danger",
  SUPPLIERS_ASSIGNED:  "violet",
  RFQ_OPEN:            "accent",
  QUOTATIONS_CLOSED:   "amber",
  UNDER_EVALUATION:    "amber",
  SUPPLIER_SELECTED:   "success",
  PROFORMA_REQUESTED:  "info",
  PROFORMA_RECEIVED:   "info",
  PROFORMA_APPROVED:   "success",
  PO_ISSUED:           "success",
  CLOSED:              "success",
  CANCELLED:           "neutral",
  EXPIRED:             "neutral",
  CLOSED_NO_AWARD:     "neutral",
};

export function RfqStateBadge({ state, compact }: { state: string; compact?: boolean }) {
  const label = compact
    ? (STATE_LIST_LABEL[state as RfqState] ?? STATE_LABEL[state as RfqState] ?? state)
    : (STATE_LABEL[state as RfqState] ?? state);
  const tone  = STATE_TONE[state as RfqState] ?? "neutral";
  return (
    <Badge
      tone={tone}
      dot
      data-testid={`rfq-state-badge-${state}`}
      className={compact ? "max-w-[160px] whitespace-normal text-left leading-snug" : undefined}
      title={STATE_LABEL[state as RfqState] ?? state}
    >
      {label}
    </Badge>
  );
}
