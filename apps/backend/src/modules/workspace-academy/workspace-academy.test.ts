// apps/backend/src/modules/workspace-academy/workspace-academy.test.ts
//
// Unit tests — service validation and user isolation (mocked Prisma).
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ACADEMY_GUIDE_IDS,
  ACADEMY_TASKS,
  academyTaskById,
  academyTasksForRole,
} from "@dmx/contracts/workspace-academy";
import { WorkspaceAcademyService } from "./workspace-academy.service.js";

function mockPrisma() {
  const upsert = vi.fn().mockResolvedValue({});
  const findUnique = vi.fn().mockResolvedValue(null);
  const findFirst = vi.fn().mockResolvedValue(null);
  const findMany = vi.fn().mockResolvedValue([]);
  const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
  const update = vi.fn().mockResolvedValue({});
  const model = { upsert, findUnique, findFirst, findMany, deleteMany, update };
  return {
    workspaceAcademyProfile: { ...model },
    workspaceAcademyGuideProgress: { ...model },
    workspaceAcademyTaskProgress: { ...model },
    workspaceAcademyArticleView: { ...model },
    workspace: { findFirst: vi.fn().mockResolvedValue(null) },
    quotation: { findFirst: vi.fn().mockResolvedValue(null) },
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
}

const USER = "11111111-1111-1111-1111-111111111111";

describe("workspace-academy contracts", () => {
  it("has unique guide ids", () => {
    expect(new Set(ACADEMY_GUIDE_IDS).size).toBe(ACADEMY_GUIDE_IDS.length);
  });

  it("has unique task ids", () => {
    const ids = ACADEMY_TASKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every prerequisite references an existing task available to the same role", () => {
    for (const task of ACADEMY_TASKS) {
      for (const pre of task.prerequisites ?? []) {
        const preDef = academyTaskById(pre);
        expect(preDef, `${task.id} → missing prerequisite ${pre}`).toBeDefined();
        const shared = task.roles.some((r) => preDef!.roles.includes(r));
        expect(shared, `${task.id} prerequisite ${pre} role mismatch`).toBe(true);
      }
    }
  });

  it("role filters return only tasks for that role", () => {
    for (const t of academyTasksForRole("BUYER")) expect(t.roles).toContain("BUYER");
    for (const t of academyTasksForRole("FORWARDER")) expect(t.roles).toContain("FORWARDER");
    expect(academyTasksForRole("BUYER").some((t) => t.id.startsWith("supplier_"))).toBe(false);
  });
});

describe("WorkspaceAcademyService validation", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc: WorkspaceAcademyService;

  beforeEach(() => {
    prisma = mockPrisma();
    svc = new WorkspaceAcademyService(prisma as never);
  });

  it("rejects unknown guide ids", async () => {
    await expect(svc.startGuide(USER, "not-a-guide", false)).rejects.toThrow(/Unknown guide id/);
    await expect(svc.completeGuide(USER, "hack-v1")).rejects.toThrow(/Unknown guide id/);
  });

  it("accepts a known guide id", async () => {
    await svc.startGuide(USER, "buyer-dashboard-v1", true);
    expect(prisma.workspaceAcademyGuideProgress.upsert).toHaveBeenCalled();
    // automatic launch is recorded on the profile
    expect(prisma.workspaceAcademyProfile.upsert).toHaveBeenCalled();
  });

  it("rejects unknown task ids", async () => {
    await expect(svc.completeTask(USER, "BUYER", "fake_task")).rejects.toThrow(/Unknown academy task/);
  });

  it("rejects a task for the wrong role", async () => {
    await expect(svc.completeTask(USER, "SUPPLIER", "buyer_first_rfq_created")).rejects.toThrow(/not available/);
  });

  it("rejects DOMAIN task completion when the real event has not happened", async () => {
    prisma.workspace.findFirst.mockResolvedValue(null);
    await expect(svc.completeTask(USER, "BUYER", "buyer_first_rfq_created")).rejects.toThrow(/cannot be completed yet/);
  });

  it("accepts DOMAIN task completion when real domain state exists", async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: "w1" });
    prisma.workspaceAcademyTaskProgress.findUnique.mockResolvedValue({
      status: "COMPLETED", completedAt: new Date(),
    });
    await svc.completeTask(USER, "BUYER", "buyer_first_rfq_created");
    expect(prisma.workspaceAcademyTaskProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_taskId: { userId: USER, taskId: "buyer_first_rfq_created" } } }),
    );
  });

  it("accepts VIEW task completion for eligible role without domain check", async () => {
    prisma.workspaceAcademyTaskProgress.findUnique.mockResolvedValue({
      status: "COMPLETED", completedAt: new Date(),
    });
    await svc.completeTask(USER, "BUYER", "buyer_document_center_visited");
    expect(prisma.workspace.findFirst).not.toHaveBeenCalled();
  });

  it("records the welcome flow on the profile", async () => {
    await svc.completeWelcome(USER, "tr");
    expect(prisma.workspaceAcademyProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER },
        update: expect.objectContaining({
          welcomeCompletedAt: expect.any(Date),
          language: "tr",
        }),
      }),
    );
  });

  it("omits language when the client did not send one", async () => {
    await svc.completeWelcome(USER);
    const arg = prisma.workspaceAcademyProfile.upsert.mock.calls[0][0];
    expect(arg.update).not.toHaveProperty("language");
  });

  it("records dismissals on the profile", async () => {
    await svc.dismissWelcome(USER);
    await svc.completeProcessOverview(USER);
    await svc.dismissChecklist(USER);
    const keys = prisma.workspaceAcademyProfile.upsert.mock.calls.map(
      (c: [{ update: Record<string, unknown> }]) => Object.keys(c[0].update)[0],
    );
    expect(keys).toEqual([
      "welcomeDismissedAt",
      "processOverviewCompletedAt",
      "checklistDismissedAt",
    ]);
  });

  it("validates task ids and roles before dismissing", async () => {
    await expect(svc.dismissTask(USER, "BUYER", "fake_task")).rejects.toThrow(/Unknown academy task/);
    await expect(
      svc.dismissTask(USER, "SUPPLIER", "buyer_first_rfq_created"),
    ).rejects.toThrow(/not available/);
  });

  it("dismissing a task skips the domain check that completion requires", async () => {
    await svc.dismissTask(USER, "BUYER", "buyer_first_rfq_created");
    expect(prisma.workspace.findFirst).not.toHaveBeenCalled();
    expect(prisma.workspaceAcademyTaskProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { status: "DISMISSED" } }),
    );
  });

  it("counts repeat article views instead of inserting duplicates", async () => {
    await svc.viewArticle(USER, "incoterms-basics");
    expect(prisma.workspaceAcademyArticleView.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_articleId: { userId: USER, articleId: "incoterms-basics" } },
        update: expect.objectContaining({ viewCount: { increment: 1 } }),
      }),
    );
  });

  it("exposes recently viewed articles in state, newest first", async () => {
    prisma.workspaceAcademyArticleView.findMany.mockResolvedValue([
      { articleId: "b" },
      { articleId: "a" },
    ]);
    const state = await svc.getState(USER, "BUYER");
    expect(state.recentArticleIds).toEqual(["b", "a"]);
    expect(prisma.workspaceAcademyArticleView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { lastViewedAt: "desc" } }),
    );
  });

  it("reset only touches the caller's own rows", async () => {
    await svc.reset(USER);
    expect(prisma.$transaction).toHaveBeenCalled();
    // Each deleteMany inside the transaction was built with the user filter.
    expect(prisma.workspaceAcademyGuideProgress.deleteMany).toHaveBeenCalledWith({ where: { userId: USER } });
    expect(prisma.workspaceAcademyProfile.deleteMany).toHaveBeenCalledWith({ where: { userId: USER } });
  });
});
