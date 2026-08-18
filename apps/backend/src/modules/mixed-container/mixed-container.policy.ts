import type { PrismaClient } from "@prisma/client";

import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "../../types/auth-user.js";
export type { AuthUser };

export async function canAccessMixedContainer(
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

export async function assertCanAccessMixedContainer(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  const ok = await canAccessMixedContainer(prisma, user, workspaceId);
  if (!ok) throw new AppError(403, "FORBIDDEN");
}

/** Procurement managers may only manage containers assigned to them (admins with no assignment have full access). */
export async function assertCanManageProcurement(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  if (user.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
  const d = await prisma.mixedContainerDetails.findUnique({
    where: { workspaceId },
    select: { assignedManagerId: true },
  });
  if (d?.assignedManagerId && d.assignedManagerId !== user.id) {
    throw new AppError(403, "PROCUREMENT_NOT_ASSIGNED");
  }
}

/** Operations managers may only manage organizations assigned to them (admins with no assignment have full access). */
export async function assertCanManageOrganization(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  if (user.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
  const d = await prisma.mixedContainerDetails.findUnique({
    where: { workspaceId },
    select: { assignedOperationsManagerId: true },
  });
  if (d?.assignedOperationsManagerId && d.assignedOperationsManagerId !== user.id) {
    throw new AppError(403, "OPERATIONS_NOT_ASSIGNED");
  }
}
