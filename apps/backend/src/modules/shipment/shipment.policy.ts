import type { PrismaClient } from "@prisma/client";

import type { AuthUser } from "../../types/auth-user.js";
export type { AuthUser };

export async function canAccessShipment(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const p = await prisma.workspaceParticipant.findFirst({
    where: { workspaceId, userId: user.id, leftAt: null },
  });
  return !!p;
}
