import { describe, expect, it } from "vitest";
import {
  parsePurchaseOrderRevisionSnapshot,
  resolveCurrentRevisionNumber,
} from "./purchase-order";
import {
  PurchaseOrderRevisionSnapshotSchema,
  PurchaseOrderRevisionDtoSchema,
} from "./purchase-order.zod";

describe("parsePurchaseOrderRevisionSnapshot", () => {
  it("parses header + lines", () => {
    const snap = parsePurchaseOrderRevisionSnapshot({
      header: {
        poNumber: "PO-1",
        currency: "USD",
        incoterm: "FOB",
        buyerReference: "REF",
        notes: "Careful",
      },
      lines: [{ sku: "A", description: "Flour", quantity: 10, unitPrice: 2, lineTotal: 20 }],
    });
    expect(snap.header.currency).toBe("USD");
    expect(snap.header.buyerReference).toBe("REF");
    expect(snap.lines).toHaveLength(1);
    expect(snap.lines[0].sku).toBe("A");
  });

  it("never throws on garbage", () => {
    expect(parsePurchaseOrderRevisionSnapshot(null).lines).toEqual([]);
    expect(parsePurchaseOrderRevisionSnapshot("x").header.currency).toBeNull();
  });
});

describe("resolveCurrentRevisionNumber", () => {
  it("returns highest revision number", () => {
    expect(resolveCurrentRevisionNumber([])).toBeNull();
    expect(resolveCurrentRevisionNumber([{ revisionNumber: 1 }, { revisionNumber: 3 }, { revisionNumber: 2 }])).toBe(3);
  });
});

describe("PurchaseOrderRevisionSnapshotSchema", () => {
  it("accepts historical snapshots", () => {
    const parsed = PurchaseOrderRevisionSnapshotSchema.safeParse({
      header: { currency: "EUR", status: "AMENDED" },
      lines: [{ description: "X", quantity: 1, unitPrice: 5 }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("PurchaseOrderRevisionDtoSchema", () => {
  it("accepts enriched actor", () => {
    const parsed = PurchaseOrderRevisionDtoSchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      purchaseOrderId: "22222222-2222-2222-2222-222222222222",
      revisionNumber: 1,
      createdById: "33333333-3333-3333-3333-333333333333",
      reason: "Initial",
      snapshotJson: { header: {}, lines: [] },
      createdAt: "2026-07-28T00:00:00.000Z",
      createdBy: { id: "33333333-3333-3333-3333-333333333333", name: "Jane" },
      isCurrent: true,
    });
    expect(parsed.success).toBe(true);
  });
});
