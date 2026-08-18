import { AppError } from "../../utils/httpErrors.js";
import { CommunicationService } from "../workspace-communication/communication.service.js";
import { UnifiedMessagingPolicy } from "./unified-messaging.policy.js";
import { registerWiredSurface } from "./messaging-write.registry.js";
import { getMessagingWriteBridge } from "./messaging-write.bridge.js";
export class UnifiedMessagingAttachmentsService {
    prisma;
    comm;
    policy;
    constructor(prisma) {
        this.prisma = prisma;
        this.comm = new CommunicationService(prisma);
        this.policy = new UnifiedMessagingPolicy(prisma);
    }
    async resolveWorkspace(conversationId) {
        const conv = await this.prisma.workspaceConversation.findUnique({
            where: { id: conversationId },
            select: { id: true, workspaceType: true, workspaceId: true },
        });
        if (!conv)
            throw new AppError(404, "CONVERSATION_NOT_FOUND");
        return conv;
    }
    async upload(user, conversationId, file) {
        await this.policy.assertConversationAccess(user, conversationId);
        registerWiredSurface("attachment_upload");
        const conv = await this.resolveWorkspace(conversationId);
        const row = await this.comm.uploadAttachment(conv.workspaceType, conv.workspaceId, user, file);
        void getMessagingWriteBridge(this.prisma)
            .onAttachmentCreated({ conversationId, attachmentId: row.id })
            .catch(() => undefined);
        return row;
    }
    async getMetadata(user, attachmentId) {
        const row = await this.prisma.workspaceMessageAttachment.findUnique({
            where: { id: attachmentId },
            include: { message: { select: { visibility: true, status: true, audienceScope: true } } },
        });
        if (!row)
            throw new AppError(404, "ATTACHMENT_NOT_FOUND");
        const conv = await this.prisma.workspaceConversation.findFirst({
            where: { workspaceType: row.workspaceType, workspaceId: row.workspaceId },
            select: { id: true },
        });
        if (conv)
            await this.policy.assertConversationAccess(user, conv.id);
        else
            throw new AppError(403, "FORBIDDEN");
        if (row.message?.audienceScope === "INTERNAL" && !this.policy.canReadAudience(user, "INTERNAL")) {
            throw new AppError(403, "FORBIDDEN");
        }
        return {
            id: row.id,
            fileName: row.fileName,
            mimeType: row.mimeType,
            fileSizeBytes: row.fileSizeBytes,
            conversationId: conv.id,
            uploadedAt: row.createdAt.toISOString(),
        };
    }
    async download(user, attachmentId) {
        const row = await this.prisma.workspaceMessageAttachment.findUnique({
            where: { id: attachmentId },
        });
        if (!row)
            throw new AppError(404, "ATTACHMENT_NOT_FOUND");
        const conv = await this.prisma.workspaceConversation.findFirst({
            where: { workspaceType: row.workspaceType, workspaceId: row.workspaceId },
            select: { id: true },
        });
        if (conv)
            await this.policy.assertConversationAccess(user, conv.id);
        else
            throw new AppError(403, "FORBIDDEN");
        return this.comm.getAttachmentForDownload(row.workspaceType, row.workspaceId, attachmentId, user);
    }
    async remove(user, attachmentId) {
        const row = await this.prisma.workspaceMessageAttachment.findUnique({
            where: { id: attachmentId },
        });
        if (!row)
            throw new AppError(404, "ATTACHMENT_NOT_FOUND");
        const conv = await this.prisma.workspaceConversation.findFirst({
            where: { workspaceType: row.workspaceType, workspaceId: row.workspaceId },
            select: { id: true },
        });
        if (!conv)
            throw new AppError(404, "ATTACHMENT_NOT_FOUND");
        await this.policy.assertConversationAccess(user, conv.id);
        if (!this.policy.canLinkContext(user))
            throw new AppError(403, "FORBIDDEN");
        await this.prisma.workspaceMessageAttachment.delete({ where: { id: attachmentId } });
        return { ok: true };
    }
}
//# sourceMappingURL=unified-messaging-attachments.service.js.map