import type { PrismaClient } from "@prisma/client";

import type { AuthUser } from "../../types/auth-user.js";
export type { AuthUser };

export async function canAccessBulkContainer(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role !== "BUYER") return false;
  const p = await prisma.workspaceParticipant.findFirst({
    where: { workspaceId, userId: user.id, participantRole: "OWNER" },
    select: { id: true },
  });
  return !!p;
}

export async function assertCanAccessBulkContainer(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  const ok = await canAccessBulkContainer(prisma, user, workspaceId);
  if (!ok) {
    const err = new Error("FORBIDDEN");
    (err as { status?: number }).status = 403;
    throw err;
  }
}
