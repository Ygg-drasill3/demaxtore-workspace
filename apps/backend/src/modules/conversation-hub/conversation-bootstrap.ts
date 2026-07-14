import type { Prisma, PrismaClient } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import type { ResolvedWorkspace } from "../workspace-communication/communication.policy.js";

type Db = PrismaClient | Prisma.TransactionClient;

export async function bootstrapWorkspaceConversation(
  db: Db,
  workspaceType: CommWorkspaceType | string,
  workspaceId: string,
): Promise<{ id: string; created: boolean }> {
  const existing = await db.workspaceConversation.findUnique({
    where: {
      workspaceType_workspaceId: { workspaceType, workspaceId },
    },
  });
  if (existing) return { id: existing.id, created: false };

  const conv = await db.workspaceConversation.create({
    data: {
      workspaceType,
      workspaceId,
      status: "ACTIVE",
    },
  });
  return { id: conv.id, created: true };
}

export async function bootstrapWithSystemEvent(
  db: PrismaClient,
  resolved: ResolvedWorkspace,
  systemEventKey: string,
  body: string,
  actorUserId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { SystemEventsService } = await import("./system-events.service.js");
  const events = new SystemEventsService(db);
  await events.record(resolved.workspaceType as CommWorkspaceType, resolved.workspaceId, {
    systemEventKey,
    systemEventType: systemEventKey,
    body,
    actorUserId,
    metadata,
  });
}
