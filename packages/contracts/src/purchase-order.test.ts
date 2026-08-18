import { describe, expect, it } from "vitest";
import {
  canonicalizePurchaseOrderSource,
  canonicalizeOrderWorkspaceOrigin,
} from "./purchase-order";
import {
  IssuePoRecordPayload,
  RequestAmendmentPayload,
  PurchaseOrderSourceSchema,
  CreateDirectPurchaseOrderSchema,
  composeDirectPoLineDescription,
} from "./purchase-order.zod";

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

describe("PurchaseOrderSourceSchema", () => {
  it("accepts canonical and reserved future values", () => {
    for (const s of ["RFQ", "DIRECT", "REORDER", "API", "LEGACY"] as const) {
      expect(PurchaseOrderSourceSchema.parse(s)).toBe(s);
    }
  });

  it("rejects invalid sources", () => {
    expect(PurchaseOrderSourceSchema.safeParse("auto").success).toBe(false);
    expect(PurchaseOrderSourceSchema.safeParse("manual").success).toBe(false);
    expect(PurchaseOrderSourceSchema.safeParse("foo").success).toBe(false);
  });
});

describe("canonicalizePurchaseOrderSource", () => {
  it("maps legacy values", () => {
    expect(canonicalizePurchaseOrderSource("auto")).toBe("RFQ");
    expect(canonicalizePurchaseOrderSource("rfq")).toBe("RFQ");
    expect(canonicalizePurchaseOrderSource("manual")).toBe("DIRECT");
    expect(canonicalizePurchaseOrderSource("direct")).toBe("DIRECT");
    expect(canonicalizePurchaseOrderSource("weird")).toBe("LEGACY");
    expect(canonicalizePurchaseOrderSource(null)).toBe("LEGACY");
  });
});

describe("canonicalizeOrderWorkspaceOrigin", () => {
  it("maps parent types and direct aliases", () => {
    expect(canonicalizeOrderWorkspaceOrigin("RFQ")).toBe("RFQ");
    expect(canonicalizeOrderWorkspaceOrigin("DIRECT")).toBe("DIRECT_PO");
    expect(canonicalizeOrderWorkspaceOrigin("COMMODITYBID")).toBe("COMMODITY_BID");
  });
});

describe("CreateDirectPurchaseOrderSchema", () => {
  const base = {
    buyerId: "11111111-1111-1111-1111-111111111111",
    supplierId: "22222222-2222-2222-2222-222222222222",
    currency: "usd",
    lines: [
      {
        productName: "Olive oil",
        quantity: 100,
        unit: "L",
        unitPrice: 2.5,
      },
    ],
  };

  it("normalizes currency and validates lines", () => {
    const parsed = CreateDirectPurchaseOrderSchema.parse(base);
    expect(parsed.currency).toBe("USD");
    expect(parsed.lines).toHaveLength(1);
  });

  it("rejects empty lines and bad currency", () => {
    expect(CreateDirectPurchaseOrderSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
    expect(CreateDirectPurchaseOrderSchema.safeParse({ ...base, currency: "US" }).success).toBe(false);
  });

  it("accepts reserved future REORDER/API as source via PurchaseOrderSourceSchema only", () => {
    expect(PurchaseOrderSourceSchema.parse("REORDER")).toBe("REORDER");
    expect(PurchaseOrderSourceSchema.parse("API")).toBe("API");
  });
});

describe("composeDirectPoLineDescription", () => {
  it("does not silently drop specification/packaging/unit", () => {
    const d = composeDirectPoLineDescription({
      productName: "Flour",
      description: "Type 00",
      specification: "Protein 12%",
      packaging: "25kg bag",
      quantity: 10,
      unit: "kg",
      unitPrice: 1,
    });
    expect(d).toContain("Flour");
    expect(d).toContain("Type 00");
    expect(d).toContain("Spec: Protein 12%");
    expect(d).toContain("Pack: 25kg bag");
    expect(d).toContain("Unit: kg");
  });
});
