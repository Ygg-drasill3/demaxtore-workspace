// packages/contracts/src/rfq.next-actions.test.ts
import { describe, it, expect } from "vitest";
import { computeRfqNextActions } from "./rfq.next-actions";

describe("computeRfqNextActions — role + participant gating", () => {
  it("terminal states yield no actions", () => {
    expect(
      computeRfqNextActions({
        state: "CANCELLED", actorRole: "BUYER", isOwner: true, isCounterparty: false,
      }),
    ).toEqual([]);
    expect(
      computeRfqNextActions({
        state: "PO_ISSUED", actorRole: "ADMIN", isOwner: false, isCounterparty: false,
      }),
    ).toEqual([]);
  });

  it("BUYER owner in RFQ_DRAFT sees Edit + Submit + Cancel — and nothing else", () => {
    const out = computeRfqNextActions({
      state: "RFQ_DRAFT", actorRole: "BUYER", isOwner: true, isCounterparty: false,
    });
    const labels = out.map((a) => a.action).sort();
    expect(labels).toEqual(["cancel_rfq", "edit_rfq_draft", "submit_rfq"].sort());
  });

  it("BUYER who is NOT the owner sees no draft actions", () => {
    const out = computeRfqNextActions({
      state: "RFQ_DRAFT", actorRole: "BUYER", isOwner: false, isCounterparty: false,
    });
    expect(out).toEqual([]);
  });

  it("ADMIN in RFQ_SUBMITTED sees Assign / Reject (no Submit)", () => {
    const out = computeRfqNextActions({
      state: "RFQ_SUBMITTED", actorRole: "ADMIN", isOwner: false, isCounterparty: false,
    });
    const labels = out.map((a) => a.action);
    expect(labels).toContain("assign_suppliers");
    expect(labels).toContain("reject_rfq");
    expect(labels).not.toContain("submit_rfq");
  });

  it("SUPPLIER counterparty in RFQ_OPEN sees Submit Quotation when no quote exists", () => {
    const out = computeRfqNextActions({
      state: "RFQ_OPEN", actorRole: "SUPPLIER", isOwner: false, isCounterparty: true,
      hasQuotationFromUser: false,
    });
    const acts = out.map((a) => a.action);
    expect(acts).toContain("submit_quotation");
    expect(acts).not.toContain("revise_quotation");
    expect(acts).not.toContain("withdraw_quotation");
  });

  it("SUPPLIER counterparty with existing quote sees Revise/Withdraw — no Submit", () => {
    const out = computeRfqNextActions({
      state: "RFQ_OPEN", actorRole: "SUPPLIER", isOwner: false, isCounterparty: true,
      hasQuotationFromUser: true,
    });
    const acts = out.map((a) => a.action);
    expect(acts).toContain("revise_quotation");
    expect(acts).toContain("withdraw_quotation");
    expect(acts).not.toContain("submit_quotation");
  });

  it("SUPPLIER who is NOT a counterparty sees nothing in RFQ_OPEN", () => {
    const out = computeRfqNextActions({
      state: "RFQ_OPEN", actorRole: "SUPPLIER", isOwner: false, isCounterparty: false,
    });
    expect(out).toEqual([]);
  });

  it("only the SELECTED supplier can submit/decline proforma", () => {
    const selected = computeRfqNextActions({
      state: "PROFORMA_REQUESTED", actorRole: "SUPPLIER",
      isOwner: false, isCounterparty: true, isSelectedSupplier: true,
    }).map((a) => a.action);
    const notSelected = computeRfqNextActions({
      state: "PROFORMA_REQUESTED", actorRole: "SUPPLIER",
      isOwner: false, isCounterparty: true, isSelectedSupplier: false,
    }).map((a) => a.action);

    expect(selected).toContain("submit_proforma");
    expect(selected).toContain("decline_proforma");
    expect(notSelected).not.toContain("submit_proforma");
    expect(notSelected).not.toContain("decline_proforma");
  });

  it("ADMIN bypasses participant constraints (sees admin-only actions everywhere)", () => {
    const out = computeRfqNextActions({
      state: "QUOTATIONS_CLOSED", actorRole: "ADMIN", isOwner: false, isCounterparty: false,
    });
    expect(out.map((a) => a.action)).toContain("reopen_quotations");
  });

  it("ADMIN in SUPPLIERS_ASSIGNED can return to review", () => {
    const out = computeRfqNextActions({
      state: "SUPPLIERS_ASSIGNED", actorRole: "ADMIN", isOwner: false, isCounterparty: false,
    });
    expect(out.map((a) => a.action)).toContain("return_to_review");
    expect(out.map((a) => a.action)).toContain("publish_rfq");
  });

  it("ADMIN in RFQ_OPEN can unpublish when rolling back", () => {
    const out = computeRfqNextActions({
      state: "RFQ_OPEN", actorRole: "ADMIN", isOwner: false, isCounterparty: false,
    });
    expect(out.map((a) => a.action)).toContain("unpublish_rfq");
  });

  it("ADMIN in RFQ_OPEN can invite additional suppliers while collecting quotations", () => {
    const out = computeRfqNextActions({
      state: "RFQ_OPEN", actorRole: "ADMIN", isOwner: false, isCounterparty: false,
    });
    expect(out.map((a) => a.action)).toContain("add_more_suppliers");
  });

  it("ADMIN in RFQ_OPEN can extend assigned supplier product scopes", () => {
    const out = computeRfqNextActions({
      state: "RFQ_OPEN", actorRole: "ADMIN", isOwner: false, isCounterparty: false,
    });
    expect(out.map((a) => a.action)).toContain("update_supplier_scopes");
  });

  it("destructive variants flag requiresConfirmation", () => {
    const out = computeRfqNextActions({
      state: "RFQ_DRAFT", actorRole: "BUYER", isOwner: true, isCounterparty: false,
    });
    const cancel = out.find((a) => a.action === "cancel_rfq")!;
    expect(cancel.variant).toBe("destructive");
    expect(cancel.requiresConfirmation).toBe(true);
    expect(cancel.requiresReason).toBe(true);
  });

  it("PARTIALLY_AWARDED exposes PO + close actions without line-scoped duplicates", () => {
    const out = computeRfqNextActions({
      state: "PARTIALLY_AWARDED", actorRole: "BUYER", isOwner: true, isCounterparty: false,
    }).map((a) => a.action);
    expect(out).toEqual(["issue_supplier_po", "close_rfq_awards"]);
  });

  it("never returns SYSTEM-only transitions", () => {
    const allStates = ["RFQ_OPEN","QUOTATIONS_CLOSED","PROFORMA_REQUESTED"] as const;
    for (const s of allStates) {
      const out = computeRfqNextActions({
        state: s, actorRole: "ADMIN", isOwner: true, isCounterparty: true, isSelectedSupplier: true, hasQuotationFromUser: true,
      });
      for (const a of out) {
        expect(a.action).not.toBe("deadline_reached");
        expect(a.action).not.toBe("deadline_reached_no_bids");
        expect(a.action).not.toBe("proforma_sla_expired");
      }
    }
  });
});
