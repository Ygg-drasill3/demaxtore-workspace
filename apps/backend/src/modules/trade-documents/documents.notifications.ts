import type { Prisma } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import { notifyCommEvent } from "../workspace-communication/communication.notifications.js";

export async function notifyDocumentEvent(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    commWorkspaceType?: CommWorkspaceType;
    commWorkspaceId?: string;
    userIds: string[];
    title: string;
    message: string;
    link?: string;
    documentId?: string;
  },
): Promise<void> {
  await notifyCommEvent(tx, {
    userIds: input.userIds,
    auditWorkspaceId: input.workspaceId,
    commWorkspaceType: input.commWorkspaceType,
    commWorkspaceId: input.commWorkspaceId,
    eventType: "document.uploaded",
    title: input.title,
    message: input.message,
    link: input.link ?? "",
    centerType: "DOCUMENT_UPLOADED",
    metadata: { documentId: input.documentId },
  });
}
