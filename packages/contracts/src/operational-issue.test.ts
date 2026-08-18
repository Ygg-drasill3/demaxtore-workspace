import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_ISSUE_CATEGORIES,
  OPERATIONAL_ISSUE_SEVERITIES,
  OPERATIONAL_ISSUE_STATUSES,
} from "./operational-issue";
import {
  CreateOperationalIssueSchema,
  ResolveOperationalIssueSchema,
} from "./operational-issue.zod";

describe("operational-issue contracts", () => {
  it("exposes statuses, severities and categories", () => {
    expect(OPERATIONAL_ISSUE_STATUSES).toContain("RESOLVED");
    expect(OPERATIONAL_ISSUE_SEVERITIES).toContain("CRITICAL");
    expect(OPERATIONAL_ISSUE_CATEGORIES).toContain("SHIPMENT_DELAY");
  });

  it("validates create/resolve schemas", () => {
    const created = CreateOperationalIssueSchema.parse({
      orderId: "11111111-1111-1111-1111-111111111111",
      title: "Shipment delayed",
      category: "SHIPMENT_DELAY",
      severity: "HIGH",
    });
    expect(created.category).toBe("SHIPMENT_DELAY");
    expect(ResolveOperationalIssueSchema.parse({ resolutionNote: "Fixed" }).resolutionNote).toBe(
      "Fixed",
    );
  });
});
