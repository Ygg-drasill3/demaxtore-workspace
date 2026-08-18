import { describe, expect, it } from "vitest";
import { computeTaskPermissions } from "./operational-task.service.js";

describe("computeTaskPermissions", () => {
  it("gives managers assign rights", () => {
    const p = computeTaskPermissions("OPS_MANAGER", { isAssignee: false, isAuthor: false });
    expect(p.canAssign).toBe(true);
    expect(p.canCreate).toBe(true);
    expect(p.canComplete).toBe(true);
  });

  it("lets assignees update progress", () => {
    const p = computeTaskPermissions("BUYER", { isAssignee: true, isAuthor: false });
    expect(p.canUpdateProgress).toBe(true);
    expect(p.canAssign).toBe(false);
  });

  it("allows suppliers to comment only", () => {
    const p = computeTaskPermissions("SUPPLIER", { isAssignee: false, isAuthor: false });
    expect(p.canComment).toBe(true);
    expect(p.canCreate).toBe(false);
    expect(p.canAssign).toBe(false);
  });
});
