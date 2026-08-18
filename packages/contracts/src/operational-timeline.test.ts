import { describe, expect, it } from "vitest";
import {
  compareOperationalTimelineEvents,
  resolveTimelineGroupKey,
  operationalEventCategoryLabel,
} from "./operational-timeline";

describe("operational-timeline", () => {
  it("sorts by occurredAt DESC then source priority then id", () => {
    const a = { id: "a", occurredAt: "2026-07-01T10:00:00.000Z", source: "timeline" };
    const b = { id: "b", occurredAt: "2026-07-02T10:00:00.000Z", source: "timeline" };
    const c = { id: "c", occurredAt: "2026-07-01T10:00:00.000Z", source: "revision" };
    const d = { id: "d", occurredAt: "2026-07-01T10:00:00.000Z", source: "revision" };
    const sorted = [a, b, c, d].sort(compareOperationalTimelineEvents);
    expect(sorted.map((e) => e.id)).toEqual(["b", "c", "d", "a"]);
  });

  it("groups relative to now", () => {
    const now = new Date("2026-07-28T15:00:00.000Z");
    expect(resolveTimelineGroupKey("2026-07-28T08:00:00.000Z", now)).toBe("today");
    expect(resolveTimelineGroupKey("2026-07-27T08:00:00.000Z", now)).toBe("yesterday");
    expect(resolveTimelineGroupKey("2026-07-22T08:00:00.000Z", now)).toBe("last7");
    expect(resolveTimelineGroupKey("2026-06-01T08:00:00.000Z", now)).toBe("older");
  });

  it("labels categories", () => {
    expect(operationalEventCategoryLabel("REVISION")).toBe("Revision");
  });
});
