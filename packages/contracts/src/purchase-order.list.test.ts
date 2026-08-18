import { describe, expect, it } from "vitest";
import { PurchaseOrderListQuerySchema } from "./purchase-order.zod";

describe("PurchaseOrderListQuerySchema", () => {
  it("applies defaults and coerces page/pageSize", () => {
    const parsed = PurchaseOrderListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(25);
    expect(parsed.sort).toBe("issuedAt");
    expect(parsed.direction).toBe("desc");
  });

  it("rejects invalid source", () => {
    expect(() => PurchaseOrderListQuerySchema.parse({ source: "FOO" })).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() => PurchaseOrderListQuerySchema.parse({ status: "OPEN" })).toThrow();
  });

  it("rejects invalid sort", () => {
    expect(() => PurchaseOrderListQuerySchema.parse({ sort: "hack" })).toThrow();
  });

  it("enforces max pageSize", () => {
    expect(() => PurchaseOrderListQuerySchema.parse({ pageSize: 500 })).toThrow();
  });

  it("rejects inverted date range", () => {
    expect(() =>
      PurchaseOrderListQuerySchema.parse({ dateFrom: "2026-07-31", dateTo: "2026-07-01" }),
    ).toThrow();
  });

  it("accepts valid DIRECT filter", () => {
    const parsed = PurchaseOrderListQuerySchema.parse({
      source: "DIRECT",
      status: "ISSUED",
      page: "2",
      pageSize: "10",
    });
    expect(parsed.source).toBe("DIRECT");
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(10);
  });
});
