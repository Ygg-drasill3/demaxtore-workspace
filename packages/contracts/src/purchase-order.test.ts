import { describe, expect, it } from "vitest";
import { IssuePoRecordPayload, RequestAmendmentPayload } from "./purchase-order.zod";

describe("IssuePoRecordPayload", () => {
  it("requires positive line quantity and price", () => {
    const ok = IssuePoRecordPayload.safeParse({
      poNumber: "PO-001",
      currency: "USD",
      lines: [{ description: "Widget", quantity: 10, unitPrice: 5 }],
    });
    expect(ok.success).toBe(true);

    expect(
      IssuePoRecordPayload.safeParse({
        poNumber: "PO-001",
        currency: "USD",
        lines: [{ description: "X", quantity: 0, unitPrice: 5 }],
      }).success,
    ).toBe(false);
  });
});

describe("RequestAmendmentPayload", () => {
  it("requires reason", () => {
    expect(RequestAmendmentPayload.safeParse({ reason: "Price update" }).success).toBe(true);
    expect(RequestAmendmentPayload.safeParse({ reason: "no" }).success).toBe(false);
  });
});
