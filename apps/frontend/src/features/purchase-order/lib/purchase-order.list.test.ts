import { describe, expect, it } from "vitest";
import {
  hasActivePurchaseOrderFilters,
  parsePurchaseOrderListFilters,
  purchaseOrderListPath,
  serializePurchaseOrderListFilters,
} from "./purchase-order.filters";
import { formatListTotal, formatPoDateShort } from "./purchase-order.formatters";

describe("purchase-order.filters", () => {
  it("parses filters from URL and falls back invalid enums", () => {
    const params = new URLSearchParams(
      "source=DIRECT&status=SUBMITTED&page=2&sort=hack&direction=asc&search=%20PO-1%20",
    );
    const filters = parsePurchaseOrderListFilters(params);
    expect(filters.source).toBe("DIRECT");
    expect(filters.status).toBe("SUBMITTED");
    expect(filters.page).toBe(2);
    expect(filters.sort).toBe("issuedAt");
    expect(filters.direction).toBe("asc");
    expect(filters.search).toBe("PO-1");
  });

  it("serializes and detects active filters", () => {
    const params = serializePurchaseOrderListFilters({
      source: "DIRECT",
      status: "SUBMITTED",
      sort: "issuedAt",
      direction: "desc",
      page: 1,
      pageSize: 25,
    });
    expect(params.get("source")).toBe("DIRECT");
    expect(params.get("status")).toBe("SUBMITTED");
    expect(params.get("page")).toBeNull();
    expect(hasActivePurchaseOrderFilters(parsePurchaseOrderListFilters(params))).toBe(true);
  });

  it("drops invalid date ranges", () => {
    const filters = parsePurchaseOrderListFilters(
      new URLSearchParams("dateFrom=2026-07-31&dateTo=2026-07-01"),
    );
    expect(filters.dateFrom).toBeUndefined();
    expect(filters.dateTo).toBeUndefined();
  });

  it("builds list path for dashboard deep links", () => {
    expect(purchaseOrderListPath("/buyer/purchase-orders", { source: "DIRECT" })).toBe(
      "/buyer/purchase-orders?source=DIRECT",
    );
  });
});

describe("list formatters", () => {
  it("formats short dates and list totals", () => {
    expect(formatPoDateShort("2026-07-27T10:00:00.000Z", "tr-TR")).toMatch(/2026/);
    expect(formatListTotal(null, "USD", "UNPRICED")).toBe("Not specified");
    expect(formatListTotal(100, "USD", "PARTIAL")).toBe("Partial pricing");
    expect(formatListTotal(1250, "USD", "COMPLETE", "tr-TR")).toMatch(/1\.250,00/);
  });
});
