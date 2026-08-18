import { describe, expect, it } from "vitest";
import { ANALYTICS_EXPORT_FORMATS, ANALYTICS_TIME_PRESETS } from "./operational-analytics";
import { AnalyticsExportQuerySchema, AnalyticsFilterQuerySchema } from "./operational-analytics.zod";

describe("operational-analytics contracts", () => {
  it("exposes presets and export formats", () => {
    expect(ANALYTICS_TIME_PRESETS).toContain("LAST_30_DAYS");
    expect(ANALYTICS_EXPORT_FORMATS).toContain("xlsx");
  });

  it("defaults filter to last 30 days", () => {
    expect(AnalyticsFilterQuerySchema.parse({}).preset).toBe("LAST_30_DAYS");
  });

  it("requires from/to for CUSTOM", () => {
    expect(() => AnalyticsFilterQuerySchema.parse({ preset: "CUSTOM" })).toThrow();
    expect(
      AnalyticsFilterQuerySchema.parse({
        preset: "CUSTOM",
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-29T00:00:00.000Z",
      }).preset,
    ).toBe("CUSTOM");
  });

  it("parses export query", () => {
    const q = AnalyticsExportQuerySchema.parse({
      preset: "TODAY",
      format: "csv",
      scope: "suppliers",
    });
    expect(q.format).toBe("csv");
    expect(q.scope).toBe("suppliers");
  });
});
