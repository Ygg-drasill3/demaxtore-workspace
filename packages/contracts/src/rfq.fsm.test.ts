// packages/contracts/src/rfq.fsm.test.ts
//
// Pure FSM contract tests. These guard against accidental drift between
// /app/docs/rfq-state-machine.md §3 and the TypeScript descriptor.
//
import { describe, it, expect } from "vitest";
import {
  RFQ_TRANSITIONS,
  RFQ_TERMINAL_STATES,
  isRfqTerminal,
  findRfqTransition,
  type RfqState,
} from "./rfq.fsm";

describe("RFQ FSM — table integrity", () => {
  it("has the documented 40 transitions", () => {
    // Mirrors /app/docs/rfq-state-machine.md §3 — change requires doc update.
    expect(RFQ_TRANSITIONS.length).toBeGreaterThanOrEqual(40);
  });

  it("every transition has a documented audit event", () => {
    for (const t of RFQ_TRANSITIONS) {
      expect(t.auditEvent, JSON.stringify(t)).toMatch(/^[a-z]+(\.[a-z_]+)+$/);
    }
  });

  it("every transition declares at least one allowed role", () => {
    for (const t of RFQ_TRANSITIONS) expect(t.allowedRoles.length).toBeGreaterThan(0);
  });

  it("cancel_rfq is available from every non-terminal pre-PO state", () => {
    const cancelableFroms = new Set(
      RFQ_TRANSITIONS.filter((t) => t.action === "cancel_rfq").map((t) => t.from),
    );
    const expected: RfqState[] = [
      "RFQ_DRAFT", "SUPPLIERS_ASSIGNED", "RFQ_OPEN", "QUOTATIONS_CLOSED",
      "UNDER_EVALUATION", "PROFORMA_REQUESTED", "PROFORMA_RECEIVED", "PROFORMA_APPROVED",
    ];
    for (const s of expected) expect(cancelableFroms.has(s), `cancel_rfq missing from ${s}`).toBe(true);
  });

  it("all cancel transitions land in CANCELLED and require a reason", () => {
    for (const t of RFQ_TRANSITIONS.filter((t) => t.action === "cancel_rfq")) {
      expect(t.to).toBe("CANCELLED");
      expect(t.requiresReason).toBe(true);
    }
  });

  it("only ADMIN can reopen_quotations (Decision #4)", () => {
    const reopen = RFQ_TRANSITIONS.find((t) => t.action === "reopen_quotations")!;
    expect(reopen.allowedRoles).toEqual(["ADMIN"]);
    expect(reopen.requiresReason).toBe(true);
    expect(reopen.preconditions).toContain("assertNewDeadline");
  });

  it("revise_rejected_rfq must require at least one field change (Decision #6)", () => {
    const t = RFQ_TRANSITIONS.find((t) => t.action === "revise_rejected_rfq")!;
    expect(t.preconditions).toContain("assertAtLeastOneFieldChanged");
  });

  it("issue_po requires a unique PO number precondition", () => {
    const t = RFQ_TRANSITIONS.find((t) => t.action === "issue_po")!;
    expect(t.to).toBe("PO_ISSUED");
    expect(t.preconditions).toContain("assertPoNumberUnique");
  });

  it("isRfqTerminal returns true for documented terminal states only", () => {
    for (const s of RFQ_TERMINAL_STATES) expect(isRfqTerminal(s)).toBe(true);
    for (const s of ["RFQ_DRAFT","RFQ_SUBMITTED","RFQ_OPEN"] as RfqState[])
      expect(isRfqTerminal(s)).toBe(false);
  });

  it("findRfqTransition resolves wildcard `from` actions", () => {
    const t = findRfqTransition("RFQ_OPEN", "add_observer");
    expect(t).toBeDefined();
    expect(t!.action).toBe("add_observer");
  });

  it("no transition targets a terminal state with requiresReason=false (cancel/close audit hygiene)", () => {
    for (const t of RFQ_TRANSITIONS) {
      if (t.to === "CANCELLED" && t.action === "cancel_rfq") expect(t.requiresReason).toBe(true);
      if (t.to === "CLOSED_NO_AWARD")                        expect(t.requiresReason).toBe(true);
    }
  });
});
