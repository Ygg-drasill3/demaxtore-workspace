import type { Prisma, PrismaClient } from "@prisma/client";
import { OnboardingAuditAction } from "@dmx/contracts/onboarding";

export async function onboardingAudit(
  db: PrismaClient,
  userId: string,
  action: (typeof OnboardingAuditAction)[keyof typeof OnboardingAuditAction],
  payload: Record<string, unknown> = {},
) {
  const anchor = await db.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, state: true },
  });
  if (!anchor) return;

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  if (!user) return;

  await db.auditLog.create({
    data: {
      workspaceId: anchor.id,
      actorUserId: userId,
      actorEmail: user.email,
      actorRole: user.role,
      action,
      fromState: anchor.state,
      toState: anchor.state,
      payload: payload as Prisma.InputJsonValue,
    },
  }).catch(() => undefined);
}
