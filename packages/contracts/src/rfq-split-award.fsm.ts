// =============================================================================
// RFQ split-award FSM extensions (line-item awards + supplier-scoped PO)
// Merged into RFQ_TRANSITIONS by rfq.fsm.ts
// =============================================================================

import type { RfqTransition } from "./rfq.fsm";

export const RFQ_SPLIT_AWARD_TRANSITIONS: RfqTransition[] = [
  // ---------- Line-item award (partial; RFQ may stay open for other lines) ----------
  { from: "RFQ_OPEN", to: "PARTIALLY_AWARDED", action: "award_line_item",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineAwardValid", "assertLineItemOpen"],
    auditEvent: "rfq.line.awarded",
    notifyRecipients: [
      { target: "COUNTERPARTY", type: "SUCCESS", titleKey: "rfq.line.awarded.supplier" },
      { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.line.awarded" },
    ] },

  { from: "RFQ_OPEN", to: "FULLY_AWARDED", action: "award_line_item",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineAwardValid", "assertLineItemOpen", "assertAllLinesTerminalAfterAward"],
    auditEvent: "rfq.line.awarded",
    notifyRecipients: [
      { target: "COUNTERPARTY", type: "SUCCESS", titleKey: "rfq.line.awarded.supplier" },
      { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.fully_awarded" },
    ] },

  { from: "PARTIALLY_AWARDED", to: "PARTIALLY_AWARDED", action: "award_line_item",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineAwardValid", "assertLineItemOpen"],
    auditEvent: "rfq.line.awarded",
    notifyRecipients: [
      { target: "COUNTERPARTY", type: "SUCCESS", titleKey: "rfq.line.awarded.supplier" },
    ] },

  { from: "PARTIALLY_AWARDED", to: "FULLY_AWARDED", action: "award_line_item",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineAwardValid", "assertLineItemOpen", "assertAllLinesTerminalAfterAward"],
    auditEvent: "rfq.line.awarded",
    notifyRecipients: [
      { target: "COUNTERPARTY", type: "SUCCESS", titleKey: "rfq.line.awarded.supplier" },
      { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.fully_awarded" },
    ] },

  { from: "QUOTATIONS_CLOSED", to: "PARTIALLY_AWARDED", action: "award_line_item",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineAwardValid", "assertLineItemOpen"],
    auditEvent: "rfq.line.awarded", notifyRecipients: [] },

  { from: "QUOTATIONS_CLOSED", to: "FULLY_AWARDED", action: "award_line_item",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineAwardValid", "assertLineItemOpen", "assertAllLinesTerminalAfterAward"],
    auditEvent: "rfq.line.awarded", notifyRecipients: [] },

  { from: "UNDER_EVALUATION", to: "PARTIALLY_AWARDED", action: "award_line_item",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineAwardValid", "assertLineItemOpen"],
    auditEvent: "rfq.line.awarded", notifyRecipients: [] },

  { from: "UNDER_EVALUATION", to: "FULLY_AWARDED", action: "award_line_item",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineAwardValid", "assertLineItemOpen", "assertAllLinesTerminalAfterAward"],
    auditEvent: "rfq.line.awarded", notifyRecipients: [] },

  // ---------- Revert / close line without award ----------
  { from: "PARTIALLY_AWARDED", to: "PARTIALLY_AWARDED", action: "revert_line_award",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    preconditions: ["assertLineAwarded", "assertLinePoNotIssued"],
    auditEvent: "rfq.line.award.reverted",
    notifyRecipients: [{ target: "COUNTERPARTY", type: "WARNING", titleKey: "rfq.line.award.reverted" }] },

  { from: "PARTIALLY_AWARDED", to: "RFQ_OPEN", action: "revert_line_award",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    preconditions: ["assertLineAwarded", "assertLinePoNotIssued", "assertNoLinesAwardedAfterRevert"],
    auditEvent: "rfq.line.award.reverted",
    notifyRecipients: [] },

  { from: "FULLY_AWARDED", to: "PARTIALLY_AWARDED", action: "revert_line_award",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    preconditions: ["assertLineAwarded", "assertLinePoNotIssued"],
    auditEvent: "rfq.line.award.reverted",
    notifyRecipients: [] },

  { from: "FULLY_AWARDED", to: "RFQ_OPEN", action: "revert_line_award",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    preconditions: ["assertLineAwarded", "assertLinePoNotIssued", "assertNoLinesAwardedAfterRevert"],
    auditEvent: "rfq.line.award.reverted",
    notifyRecipients: [] },

  { from: "RFQ_OPEN", to: "PARTIALLY_AWARDED", action: "mark_line_no_award",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineItemOpen"],
    auditEvent: "rfq.line.no_award",
    notifyRecipients: [] },

  { from: "RFQ_OPEN", to: "FULLY_AWARDED", action: "mark_line_no_award",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineItemOpen", "assertAllLinesTerminalAfterNoAward"],
    auditEvent: "rfq.line.no_award",
    notifyRecipients: [] },

  { from: "PARTIALLY_AWARDED", to: "PARTIALLY_AWARDED", action: "mark_line_no_award",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineItemOpen"],
    auditEvent: "rfq.line.no_award",
    notifyRecipients: [] },

  { from: "PARTIALLY_AWARDED", to: "FULLY_AWARDED", action: "mark_line_no_award",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertLineItemOpen", "assertAllLinesTerminalAfterNoAward"],
    auditEvent: "rfq.line.no_award",
    notifyRecipients: [] },

  // ---------- Supplier-scoped PO (groups all AWARDED lines for one supplier) ----------
  { from: "PARTIALLY_AWARDED", to: "PARTIALLY_AWARDED", action: "issue_supplier_po",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertSupplierHasAwardedLines", "assertSupplierPoNotYetIssued"],
    auditEvent: "po.issued.supplier",
    notifyRecipients: [
      { target: "COUNTERPARTY", type: "SUCCESS", titleKey: "po.issued" },
      { broadcast: { role: "ADMIN" }, type: "SUCCESS", titleKey: "po.issued" },
    ] },

  { from: "FULLY_AWARDED", to: "FULLY_AWARDED", action: "issue_supplier_po",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertSupplierHasAwardedLines", "assertSupplierPoNotYetIssued"],
    auditEvent: "po.issued.supplier",
    notifyRecipients: [
      { target: "COUNTERPARTY", type: "SUCCESS", titleKey: "po.issued" },
    ] },

  { from: "FULLY_AWARDED", to: "PO_ISSUED", action: "issue_supplier_po",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    preconditions: ["assertSupplierHasAwardedLines", "assertSupplierPoNotYetIssued", "assertAllAwardedLinesHavePo"],
    auditEvent: "po.issued.supplier",
    notifyRecipients: [
      { target: "COUNTERPARTY", type: "SUCCESS", titleKey: "po.issued" },
    ] },

  // ---------- Close RFQ without awarding every line ----------
  { from: "PARTIALLY_AWARDED", to: "CLOSED", action: "close_rfq_awards",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    preconditions: ["assertCanClosePartialAwards"],
    auditEvent: "rfq.closed.partial_award",
    notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "rfq.closed" }] },

  { from: "FULLY_AWARDED", to: "CLOSED", action: "close_rfq_awards",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    auditEvent: "rfq.closed",
    notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "rfq.closed" }] },

  { from: "RFQ_OPEN", to: "CLOSED", action: "close_rfq_awards",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    preconditions: ["assertCanClosePartialAwards"],
    auditEvent: "rfq.closed",
    notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "rfq.closed" }] },
];
