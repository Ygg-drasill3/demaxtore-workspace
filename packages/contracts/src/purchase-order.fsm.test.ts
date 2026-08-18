import { describe, expect, it } from "vitest";
import {
  assertCanTransitionPoStatus,
  canTransitionPoStatus,
  canonicalizePurchaseOrderStatus,
  canonicalizePoTimelineEvent,
  isDraftPoStatus,
  isTerminalPoStatus,
  PO_CANCEL_ALLOWED_FROM,
  PO_CLOSE_ALLOWED_FROM,
} from "./purchase-order.fsm";

describe("canonicalizePurchaseOrderStatus", () => {
  it("maps legacy statuses", () => {
    expect(canonicalizePurchaseOrderStatus("ISSUED")).toBe("SUBMITTED");
    expect(canonicalizePurchaseOrderStatus("ACKNOWLEDGED")).toBe("APPROVED");
    expect(canonicalizePurchaseOrderStatus("AMENDMENT_REQUESTED")).toBe("APPROVED");
    expect(canonicalizePurchaseOrderStatus("AMENDED")).toBe("IN_EXECUTION");
  });

  it("keeps canonical statuses", () => {
    expect(canonicalizePurchaseOrderStatus("DRAFT")).toBe("DRAFT");
    expect(canonicalizePurchaseOrderStatus("COMPLETED")).toBe("COMPLETED");
    expect(canonicalizePurchaseOrderStatus("CLOSED")).toBe("CLOSED");
  });
});

describe("PO FSM transitions", () => {
  it("allows happy path", () => {
    expect(canTransitionPoStatus("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransitionPoStatus("SUBMITTED", "APPROVED")).toBe(true);
    expect(canTransitionPoStatus("APPROVED", "IN_EXECUTION")).toBe(true);
    expect(canTransitionPoStatus("IN_EXECUTION", "COMPLETED")).toBe(true);
    expect(canTransitionPoStatus("COMPLETED", "CLOSED")).toBe(true);
  });

  it("blocks invalid close/cancel", () => {
    expect(canTransitionPoStatus("SUBMITTED", "CLOSED")).toBe(false);
    expect(canTransitionPoStatus("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionPoStatus("CLOSED", "CANCELLED")).toBe(false);
    expect(() => assertCanTransitionPoStatus("DRAFT", "APPROVED")).toThrow(/Invalid PO transition/);
  });

  it("close/cancel allow-lists match PRR", () => {
    expect(PO_CLOSE_ALLOWED_FROM).toEqual(["COMPLETED"]);
    expect(PO_CANCEL_ALLOWED_FROM).toContain("DRAFT");
    expect(PO_CANCEL_ALLOWED_FROM).toContain("IN_EXECUTION");
    expect(PO_CANCEL_ALLOWED_FROM).not.toContain("COMPLETED");
  });

  it("terminal + draft helpers", () => {
    expect(isTerminalPoStatus("CLOSED")).toBe(true);
    expect(isTerminalPoStatus("CANCELLED")).toBe(true);
    expect(isDraftPoStatus("DRAFT")).toBe(true);
    expect(isDraftPoStatus("ISSUED")).toBe(false);
  });
});

describe("canonicalizePoTimelineEvent", () => {
  it("maps legacy names", () => {
    expect(canonicalizePoTimelineEvent("PURCHASE_ORDER_CREATED")).toBe("po.created");
    expect(canonicalizePoTimelineEvent("po.issued")).toBe("po.submitted");
    expect(canonicalizePoTimelineEvent("po.revised")).toBe("po.revised");
  });
});
