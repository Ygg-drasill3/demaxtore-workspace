import { describe, expect, it } from "vitest";
import { formatWorkspaceRef, workspaceRefLabel } from "./workspace-ref";

describe("formatWorkspaceRef", () => {
  it("formats ORD-RFQ refs as Order NNNN", () => {
    const r = formatWorkspaceRef("ORD-RFQ-2026-0239-38bf7df9");
    expect(r.label).toBe("Order 0239");
    expect(r.detail).toBe("from RFQ · 2026");
    expect(r.kind).toBe("order");
    expect(r.full).toBe("ORD-RFQ-2026-0239-38bf7df9");
  });

  it("formats RFQ refs", () => {
    expect(workspaceRefLabel("RFQ-2026-0183-abcdef12")).toBe("RFQ 0183");
  });

  it("formats direct-PO spawn refs", () => {
    const r = formatWorkspaceRef("ORD-DIR-PO-MSOJSFGG-E12AD05A-E12AD05A");
    expect(r.label).toBe("Order MSOJSFGG");
    expect(r.detail).toBe("from Direct PO");
    expect(r.kind).toBe("order");
  });

  it("handles empty", () => {
    expect(formatWorkspaceRef("").label).toBe("—");
  });
});
