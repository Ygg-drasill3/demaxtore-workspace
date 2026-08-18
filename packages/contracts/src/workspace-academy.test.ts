import { describe, expect, it } from "vitest";
import {
  ACADEMY_GUIDE_IDS,
  ACADEMY_TASKS,
  academyTaskById,
  academyTasksForRole,
} from "./workspace-academy.js";

describe("workspace-academy contracts", () => {
  it("has unique guide ids", () => {
    expect(new Set(ACADEMY_GUIDE_IDS).size).toBe(ACADEMY_GUIDE_IDS.length);
  });

  it("has unique task ids", () => {
    expect(new Set(ACADEMY_TASKS.map((t) => t.id)).size).toBe(ACADEMY_TASKS.length);
  });

  it("academyTaskById returns known tasks", () => {
    const first = ACADEMY_TASKS[0];
    expect(first).toBeTruthy();
    expect(academyTaskById(first.id)?.id).toBe(first.id);
    expect(academyTaskById("missing-task-id")).toBeUndefined();
  });

  it("academyTasksForRole filters by role", () => {
    const buyer = academyTasksForRole("BUYER");
    expect(buyer.length).toBeGreaterThan(0);
    expect(buyer.every((t) => t.roles.includes("BUYER"))).toBe(true);
  });
});
