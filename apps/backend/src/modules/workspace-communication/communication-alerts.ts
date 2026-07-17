import type { PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
import { resolveWorkspace } from "./communication.policy.js";

const H_48 = 48 * 3_600_000;
const H_72 = 72 * 3_600_000;
const H_96 = 96 * 3_600_000;

export async function scanWorkspaceCommunicationAlerts(db: PrismaClient): Promise<number> {
  let n = 0;
  const now = new Date();

  const questions = await db.workspaceMessage.findMany({
    where: { messageType: "QUESTION", status: { not: "DELETED" } },
    include: { conversation: true, readReceipts: true },
    take: 100,
  });

  for (const q of questions) {
    const resolved = await resolveWorkspace(
      db,
      q.conversation.workspaceType as never,
      q.conversation.workspaceId,
    );
    if (!resolved) continue;

    const nonAuthorReaders = q.readReceipts.filter((r) => r.userId !== q.authorUserId);
    if (nonAuthorReaders.length > 0) continue;

    const age = now.getTime() - q.createdAt.getTime();
    if (age >= H_96) {
      if (await upsertControlTowerAlert(db, {
        workspaceId: resolved.auditWorkspaceId,
        alertKey: AlertKey.COMM_QUESTION_UNREAD_96H,
        severity: "CRITICAL",
        category: "SYSTEM",
        workspaceType: "ORDER",
        title: "Unread question >96h",
        description: q.body.slice(0, 120),
      }, { allowTestWorkspace: true })) n++;
    } else if (age >= H_48) {
      if (await upsertControlTowerAlert(db, {
        workspaceId: resolved.auditWorkspaceId,
        alertKey: AlertKey.COMM_QUESTION_UNREAD_48H,
        severity: "WARNING",
        category: "SYSTEM",
        workspaceType: "ORDER",
        title: "Unread question >48h",
        description: q.body.slice(0, 120),
      }, { allowTestWorkspace: true })) n++;
    }
  }

  const decisions = await db.workspaceMessage.findMany({
    where: {
      messageType: "DECISION",
      status: { not: "DELETED" },
      createdAt: { lte: new Date(now.getTime() - H_72) },
    },
    include: { conversation: true },
    take: 50,
  });

  for (const d of decisions) {
    const resolved = await resolveWorkspace(
      db,
      d.conversation.workspaceType as never,
      d.conversation.workspaceId,
    );
    if (!resolved) continue;

    const followUp = await db.workspaceMessage.findFirst({
      where: {
        conversationId: d.conversationId,
        createdAt: { gt: d.createdAt },
        status: { not: "DELETED" },
        authorUserId: { not: d.authorUserId },
      },
    });
    if (followUp) continue;

    if (await upsertControlTowerAlert(db, {
      workspaceId: resolved.auditWorkspaceId,
      alertKey: AlertKey.COMM_DECISION_NO_RESPONSE_72H,
      severity: "WARNING",
      category: "SYSTEM",
      workspaceType: "ORDER",
      title: "Decision without response",
      description: d.body.slice(0, 120),
    })) n++;
  }

  const notes = await db.workspaceMessage.findMany({
    where: {
      messageType: "INTERNAL_NOTE",
      status: { not: "DELETED" },
      createdAt: { lte: new Date(now.getTime() - H_72) },
    },
    include: { conversation: true },
    take: 50,
  });

  for (const note of notes) {
    const resolved = await resolveWorkspace(
      db,
      note.conversation.workspaceType as never,
      note.conversation.workspaceId,
    );
    if (!resolved) continue;

    const followUp = await db.workspaceMessage.findFirst({
      where: {
        conversationId: note.conversationId,
        createdAt: { gt: note.createdAt },
        status: { not: "DELETED" },
      },
    });
    if (followUp) continue;

    if (await upsertControlTowerAlert(db, {
      workspaceId: resolved.auditWorkspaceId,
      alertKey: AlertKey.COMM_INTERNAL_NOTE_NO_FOLLOWUP_72H,
      severity: "WARNING",
      category: "SYSTEM",
      workspaceType: "ORDER",
      title: "Internal note without follow-up",
      description: note.body.slice(0, 120),
    })) n++;
  }

  return n;
}
