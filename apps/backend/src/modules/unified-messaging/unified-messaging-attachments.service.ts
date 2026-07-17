import type { PrismaClient } from "@prisma/client";
import { AppError } from "../../utils/httpErrors.js";
import { CommunicationService } from "../workspace-communication/communication.service.js";
import { UnifiedMessagingPolicy } from "./unified-messaging.policy.js";
import { getMessagingWriteBridge } from "./messaging-write.bridge.js";
import type { AuthUser } from "./unified-messaging.types.js";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";

export class UnifiedMessagingAttachmentsService {
  private readonly comm: CommunicationService;
  private readonly policy: UnifiedMessagingPolicy;

  constructor(private readonly prisma: PrismaClient) {
    this.comm = new CommunicationService(prisma);
    this.policy = new UnifiedMessagingPolicy(prisma);
  }

  private async resolveWorkspace(conversationId: string) {
    const conv = await this.prisma.workspaceConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, workspaceType: true, workspaceId: true },
    });
    if (!conv) throw new AppError(404, "CONVERSATION_NOT_FOUND");
    return conv;
  }

  async upload(
    user: AuthUser,
    conversationId: string,
    file: { originalName: string; mimeType: string; sizeBytes: number; buffer: Buffer },
  ) {
    await this.policy.assertConversationAccess(user, conversationId);
    const conv = await this.resolveWorkspace(conversationId);
    const row = await this.comm.uploadAttachment(
      conv.workspaceType as CommWorkspaceType,
      conv.workspaceId,
      user,
      file,
    );
    void getMessagingWriteBridge(this.prisma)
      .onAttachmentCreated({ conversationId, attachmentId: row.id })
      .catch(() => undefined);
    return row;
  }

  async getMetadata(user: AuthUser, attachmentId: string) {
    const row = await this.prisma.workspaceMessageAttachment.findUnique({
      where: { id: attachmentId },
      include: { message: { select: { visibility: true, status: true, audienceScope: true } } },
    });
    if (!row) throw new AppError(404, "ATTACHMENT_NOT_FOUND");

    const conv = await this.prisma.workspaceConversation.findFirst({
      where: { workspaceType: row.workspaceType, workspaceId: row.workspaceId },
      select: { id: true },
    });
    if (conv) await this.policy.assertConversationAccess(user, conv.id);
    else throw new AppError(403, "FORBIDDEN");

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

  async download(user: AuthUser, attachmentId: string) {
    const row = await this.prisma.workspaceMessageAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!row) throw new AppError(404, "ATTACHMENT_NOT_FOUND");

    const conv = await this.prisma.workspaceConversation.findFirst({
      where: { workspaceType: row.workspaceType, workspaceId: row.workspaceId },
      select: { id: true },
    });
    if (conv) await this.policy.assertConversationAccess(user, conv.id);
    else throw new AppError(403, "FORBIDDEN");

    return this.comm.getAttachmentForDownload(
      row.workspaceType as CommWorkspaceType,
      row.workspaceId,
      attachmentId,
      user,
    );
  }

  async remove(user: AuthUser, attachmentId: string) {
    const row = await this.prisma.workspaceMessageAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!row) throw new AppError(404, "ATTACHMENT_NOT_FOUND");

    const conv = await this.prisma.workspaceConversation.findFirst({
      where: { workspaceType: row.workspaceType, workspaceId: row.workspaceId },
      select: { id: true },
    });
    if (!conv) throw new AppError(404, "ATTACHMENT_NOT_FOUND");
    await this.policy.assertConversationAccess(user, conv.id);
    if (!this.policy.canLinkContext(user)) throw new AppError(403, "FORBIDDEN");

    await this.prisma.workspaceMessageAttachment.delete({ where: { id: attachmentId } });
    return { ok: true };
  }
}
