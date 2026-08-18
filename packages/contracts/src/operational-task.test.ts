import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_TASK_AUTOMATION_KEYS,
  OPERATIONAL_TASK_PRIORITIES,
  OPERATIONAL_TASK_STATUSES,
} from "./operational-task";
import {
  AssignOperationalTaskSchema,
  CreateOperationalTaskCommentSchema,
  CreateOperationalTaskSchema,
} from "./operational-task.zod";

describe("operational-task contracts", () => {
  it("exposes statuses and priorities", () => {
    expect(OPERATIONAL_TASK_STATUSES).toContain("IN_PROGRESS");
    expect(OPERATIONAL_TASK_PRIORITIES).toContain("CRITICAL");
    expect(OPERATIONAL_TASK_AUTOMATION_KEYS.ASSIGN_INSPECTOR).toBe("assign_inspector");
  });

  it("validates create / assign / comment", () => {
    expect(
      CreateOperationalTaskSchema.parse({
        orderId: "00000000-0000-4000-8000-000000000001",
        title: "Upload BL",
        priority: "HIGH",
      }).title,
    ).toBe("Upload BL");
    expect(
      AssignOperationalTaskSchema.parse({
        assignedToId: "00000000-0000-4000-8000-000000000002",
      }).assignedToId,
    ).toBeTruthy();
    expect(CreateOperationalTaskCommentSchema.parse({ message: "Done" }).message).toBe("Done");
  });
});
