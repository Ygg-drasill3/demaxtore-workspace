// =============================================================================
// DeMaxtore — RFQ notification recipient resolver
// Destination: apps/backend/src/modules/rfq/rfq.notifications.ts
//
// Pure (modulo Prisma reads) — given a transition + workspace context, returns
// the concrete list of notification rows to insert + the socket fan-out spec.
// =============================================================================
import type { Prisma } from "@prisma/client";
import type { RfqTransition, ActorRole, NotificationType } from "@dmx/contracts/rfq.fsm";

export interface ResolvedRecipient {
  userId?: string;
  broadcastRole?: "BUYER" | "SUPPLIER" | "ADMIN";
  notificationType: NotificationType;
  title:   string;
  message: string;
}

interface WorkspaceFullForNotify {
  id: string;
  participants: Array<{ userId: string; participantRole: string }>;
  rfqDetails?: { selectedSupplierUserId?: string | null; title: string } | null;
  createdById: string;
  externalRef: string;
}

export async function resolveRecipients(
  _tx: Prisma.TransactionClient,
  transition: RfqTransition,
  workspace: WorkspaceFullForNotify,
  actor: { id: string; role: ActorRole; email: string },
): Promise<ResolvedRecipient[]> {
  const out: ResolvedRecipient[] = [];
  const refLabel = workspace.externalRef;

  const owner = workspace.createdById;
  const counterparties = workspace.participants
    .filter((p) => p.participantRole === "COUNTERPARTY")
    .map((p) => p.userId);
  const operators = workspace.participants
    .filter((p) => p.participantRole === "OPERATOR")
    .map((p) => p.userId);
  const selected = workspace.rfqDetails?.selectedSupplierUserId ?? null;
  const allParticipants = Array.from(
    new Set([owner, ...counterparties, ...operators, ...workspace.participants.map((p) => p.userId)]),
  );

  for (const spec of transition.notifyRecipients) {
    const meta = { title: titleFor(spec.titleKey, refLabel), message: messageFor(spec.titleKey, refLabel) };

    if (spec.broadcast) {
      out.push({
        broadcastRole: spec.broadcast.role as ResolvedRecipient["broadcastRole"],
        notificationType: spec.type,
        ...meta,
      });
      continue;
    }
    if (spec.target === "OWNER" && owner !== actor.id) {
      out.push({ userId: owner, notificationType: spec.type, ...meta });
    }
    if (spec.target === "COUNTERPARTY") {
      for (const uid of counterparties) {
        if (uid === actor.id) continue;
        out.push({ userId: uid, notificationType: spec.type, ...meta });
      }
    }
    if (spec.target === "OPERATOR") {
      for (const uid of operators) {
        if (uid === actor.id) continue;
        out.push({ userId: uid, notificationType: spec.type, ...meta });
      }
    }
    if (spec.target === "SELECTED_SUPPLIER" && selected) {
      out.push({ userId: selected, notificationType: spec.type, ...meta });
    }
    if (spec.target === "ALL_PARTICIPANTS") {
      for (const uid of allParticipants) {
        if (uid === actor.id) continue;
        out.push({ userId: uid, notificationType: spec.type, ...meta });
      }
    }
  }
  return out;
}

// Minimal i18n shim — production code wires this to a real locale catalogue.
function titleFor(key: string, ref: string): string {
  return TITLE_MAP[key]?.replace("{ref}", ref) ?? key;
}
function messageFor(key: string, ref: string): string {
  return MESSAGE_MAP[key]?.replace("{ref}", ref) ?? "";
}

const TITLE_MAP: Record<string, string> = {
  "rfq.submitted.admin":             "New RFQ awaiting triage: {ref}",
  "rfq.rejected_by_admin":           "Your RFQ was rejected — please revise",
  "rfq.cancelled":                   "RFQ cancelled: {ref}",
  "rfq.suppliers.assigned.supplier": "You've been assigned to RFQ {ref}",
  "rfq.suppliers.assigned.buyer":    "Suppliers assigned to your RFQ",
  "rfq.suppliers.added":             "Additional suppliers added to RFQ {ref}",
  "rfq.published":                   "RFQ is now open for quotations: {ref}",
  "rfq.deadline.extended":           "RFQ deadline extended: {ref}",
  "rfq.quotations.closed":           "Quotation period closed: {ref}",
  "rfq.quotations.reopened":         "Quotation period re-opened: {ref}",
  "rfq.evaluation.ready":            "Time to evaluate quotations: {ref}",
  "rfq.evaluation.started":          "Buyer has started evaluation",
  "rfq.expired":                     "RFQ expired with no bids: {ref}",
  "rfq.expired.admin":               "RFQ expired with no bids: {ref}",
  "rfq.revised_from_rejection":      "Rejected RFQ revised & resubmitted: {ref}",
  "rfq.you_won":                     "Congratulations — you won {ref}",
  "rfq.you_lost":                    "Result for {ref}: not selected",
  "rfq.closed_no_award":             "RFQ closed without award: {ref}",
  "rfq.supplier.selected":           "Supplier selected for {ref}",
  "rfq.selection.reverted":          "Selection reverted on {ref}",
  "rfq.clarification.posted":        "New clarification on {ref}",
  "quotation.submitted":             "New quotation submitted for {ref}",
  "quotation.revised":               "Quotation revised on {ref}",
  "quotation.withdrawn":             "Quotation withdrawn on {ref}",
  "proforma.requested":              "Proforma requested (SLA: 5 business days)",
  "proforma.submitted":              "Proforma uploaded for {ref}",
  "proforma.declined":               "Supplier declined proforma on {ref}",
  "proforma.sla_expired":            "Proforma SLA expired on {ref}",
  "proforma.approved":               "Proforma approved on {ref}",
  "proforma.rejected":               "Proforma revision requested on {ref}",
  "po.issued":                       "PO issued for {ref}",
};
const MESSAGE_MAP: Record<string, string> = {
  // intentionally lean — UI uses title only on bell; deep-link via notification.link
};
