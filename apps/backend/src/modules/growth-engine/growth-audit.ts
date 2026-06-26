import type { Prisma, PrismaClient } from "@prisma/client";

export async function growthAudit(
  db: PrismaClient,
  action: "growth.report.generated" | "growth.insight.generated" | "growth.export.generated",
  payload: Record<string, unknown>,
) {
  const anchor = await db.workspace.findFirst({
    where: { type: "ORDER" },
    orderBy: { createdAt: "asc" },
    select: { id: true, state: true },
  });
  if (!anchor) return;
  await db.auditLog.create({
    data: {
      workspaceId: anchor.id,
      actorUserId: "00000000-0000-0000-0000-000000000001",
      actorEmail: "system@demaxtore.local",
      actorRole: "SYSTEM",
      action,
      fromState: anchor.state,
      toState: anchor.state,
      payload: payload as Prisma.InputJsonValue,
    },
  }).catch(() => undefined);
}
