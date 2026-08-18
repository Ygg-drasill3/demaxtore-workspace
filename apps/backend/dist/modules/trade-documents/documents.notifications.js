import { notifyCommEvent } from "../workspace-communication/communication.notifications.js";
export async function notifyDocumentEvent(tx, input) {
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
//# sourceMappingURL=documents.notifications.js.map