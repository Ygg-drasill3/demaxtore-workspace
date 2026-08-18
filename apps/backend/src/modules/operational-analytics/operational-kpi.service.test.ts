import { describe, expect, it } from "vitest";
import { computeAnalyticsPermissions } from "./analytics-permissions.js";
import { resolveAnalyticsRange } from "./operational-kpi.service.js";
import { csvEscape, toCsv, toXlsx } from "./analytics-export.js";

describe("analytics-permissions", () => {
  it("allows ops viewer dashboard access", () => {
    expect(computeAnalyticsPermissions("LOGISTICS_OPERATOR").canView).toBe(true);
    expect(computeAnalyticsPermissions("BUYER").canView).toBe(false);
  });

  it("gates supplier KPIs to managers", () => {
    expect(computeAnalyticsPermissions("LOGISTICS_OPERATOR").canViewSuppliers).toBe(false);
    expect(computeAnalyticsPermissions("OPS_MANAGER").canViewSuppliers).toBe(true);
    expect(computeAnalyticsPermissions("ADMIN").canExport).toBe(true);
  });
});

describe("resolveAnalyticsRange", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");

  it("resolves LAST_30_DAYS", () => {
    const r = resolveAnalyticsRange({ preset: "LAST_30_DAYS" }, now);
    expect(r.preset).toBe("LAST_30_DAYS");
    expect(new Date(r.to).getTime()).toBe(now.getTime());
    expect(new Date(r.from).getTime()).toBe(now.getTime() - 30 * 86_400_000);
  });

  it("resolves CUSTOM", () => {
    const r = resolveAnalyticsRange(
      {
        preset: "CUSTOM",
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-15T00:00:00.000Z",
      },
      now,
    );
    expect(r.from).toBe("2026-07-01T00:00:00.000Z");
    expect(r.to).toBe("2026-07-15T00:00:00.000Z");
  });
});

describe("analytics-export", () => {
  it("builds CSV", () => {
    const csv = toCsv(["a", "b"], [["1", 'x,y'], [null, "ok"]]);
    expect(csv).toContain("a,b");
    expect(csv).toContain('"x,y"');
    expect(csvEscape("a\"b")).toBe('"a""b"');
  });

  it("builds XLSX buffer with zip signature", () => {
    const buf = toXlsx("Summary", ["metric", "value"], [["openOrders", 3]]);
    expect(buf.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(buf.length).toBeGreaterThan(100);
  });
});
