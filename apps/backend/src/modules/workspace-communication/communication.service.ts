import type { Prisma, PrismaClient } from "@prisma/client";
import { writeStoredFile, deleteStoredFile, assertStoredFileExists } from "../../lib/file-storage.js";
import { validateUpload } from "../../lib/upload-security.js";
import { logger } from "../../config/logger.js";
import type {
  CommWorkspaceType,
  CommunicationAction,
  MessageSearchResult,
  MessageVisibility,
  WorkspaceConversation,
  WorkspaceMessage,
} from "@dmx/contracts/workspace-communication";
import { TIMELINE_MESSAGE_TYPES } from "@dmx/contracts/workspace-communication";
import {
  CreateMessagePayload,
  DeleteMessagePayload,
  EditMessagePayload,
  MarkReadPayload,
  MessageSearchQuerySchema,
} from "@dmx/contracts/workspace-communication.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { AppError } from "../../utils/httpErrors.js";
import {
  assertCanCreateVisibility,
  canViewMessage,
  type VisibilityContext,
} from "./communication.visibility.js";
import {
  buildVisibilityContext,
  canAccessCommWorkspace,
  resolveWorkspace,
  type AuthUser,
  type ResolvedWorkspace,
} from "./communication.policy.js";
import { notifyCommEvent } from "./communication.notifications.js";
import { getMessagingWriteBridge } from "../unified-messaging/messaging-write.bridge.js";
import { getMessagingWriteDispatcher } from "../unified-messaging/messaging-write.dispatcher.js";
import {
  buildNotificationOutbox,
  buildSocketOutbox,
} from "../unified-messaging/messaging-write.registry.js";

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/msword",
]);

const MAX_FILE_BYTES = 25 * 1024 * 1024;

type MessageRow = Prisma.WorkspaceMessageGetPayload<{
  include: {
    mentions: true;
    readReceipts: true;
    attachments: true;
  };
}>;

export class CommunicationService {
  constructor(private readonly db: PrismaClient) {}

  async getConversation(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
  ): Promise<WorkspaceConversation> {
    if (!(await canAccessCommWorkspace(this.db, actor, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");

    const conv = await this.ensureConversation(resolved);
    const ctx = await buildVisibilityContext(this.db, resolved);
    const rows = await this.db.workspaceMessage.findMany({
      where: { conversationId: conv.id, status: { not: "DELETED" } },
      orderBy: { createdAt: "asc" },
      include: { mentions: true, readReceipts: true, attachments: true },
    });

    const visible = rows.filter((m) => canViewMessage(actor, m.visibility as never, ctx));
    const messages = await this.mapMessages(visible, actor, ctx);

    const unreadCount = messages.filter((m) => !m.readByMe && m.authorUserId !== actor.id).length;
    const mentionCount = messages.filter(
      (m) => m.mentions.some((x) => x.userId === actor.id) && !m.readByMe,
    ).length;

    return {
      id: conv.id,
      workspaceType,
      workspaceId,
      auditWorkspaceId: resolved.auditWorkspaceId,
      messages,
      unreadCount,
      mentionCount,
    };
  }

  async searchMessages(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    query: unknown,
  ): Promise<MessageSearchResult> {
    if (!(await canAccessCommWorkspace(this.db, actor, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");
    const q = MessageSearchQuerySchema.parse(query);
    const conv = await this.ensureConversation(resolved);
    const ctx = await buildVisibilityContext(this.db, resolved);

    const where: Prisma.WorkspaceMessageWhereInput = {
      conversationId: conv.id,
      status: { not: "DELETED" },
    };
    if (q.authorUserId) where.authorUserId = q.authorUserId;
    if (q.messageType) where.messageType = q.messageType;
    if (q.visibility) where.visibility = q.visibility;
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {};
      if (q.dateFrom) where.createdAt.gte = new Date(q.dateFrom);
      if (q.dateTo) where.createdAt.lte = new Date(q.dateTo);
    }
    if (q.hasAttachment) where.attachments = { some: {} };
    if (q.mentionedMe) where.mentions = { some: { mentionedUserId: actor.id } };
    if (q.q) where.body = { contains: q.q, mode: "insensitive" };

    const rows = await this.db.workspaceMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q.limit,
      skip: q.offset,
      include: { mentions: true, readReceipts: true, attachments: true },
    });

    const visible = rows.filter((m) => canViewMessage(actor, m.visibility as never, ctx));
    const items = await this.mapMessages(visible, actor, ctx);
    return { items, total: items.length };
  }

  async applyCommunicationAction(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    action: CommunicationAction,
    actor: AuthUser,
    payload: Record<string, unknown> = {},
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<WorkspaceConversation> {
    if (!(await canAccessCommWorkspace(this.db, actor, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }

    switch (action) {
      case "create_message":
        await this.createMessage(
          workspaceType,
          workspaceId,
          actor,
          CreateMessagePayload.parse(payload),
          ctx,
        );
        break;
      case "edit_message":
        await this.editMessage(workspaceType, workspaceId, actor, EditMessagePayload.parse(payload), ctx);
        break;
      case "delete_message":
        await this.deleteMessage(workspaceType, workspaceId, actor, DeleteMessagePayload.parse(payload), ctx);
        break;
      case "mark_read":
        await this.markRead(
          workspaceType,
          workspaceId,
          actor,
          MarkReadPayload.parse(payload),
          ctx,
        );
        break;
      default:
        throw new AppError(400, "UNKNOWN_ACTION");
    }

    return this.getConversation(workspaceType, workspaceId, actor);
  }

  async uploadAttachment(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    file: { originalName: string; mimeType: string; sizeBytes: number; buffer: Buffer },
  ) {
    return this.uploadAttachmentDirect(workspaceType, workspaceId, actor, file);
  }

  private async uploadAttachmentDirect(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    file: { originalName: string; mimeType: string; sizeBytes: number; buffer: Buffer },
  ) {
    if (!(await canAccessCommWorkspace(this.db, actor, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }

    let safeName: string;
    try {
      ({ safeName } = validateUpload(
        { originalname: file.originalName, mimetype: file.mimeType, size: file.sizeBytes, buffer: file.buffer },
        { maxBytes: MAX_FILE_BYTES, allowedMimes: ALLOWED_MIMES },
      ));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "INVALID_FILE";
      if (msg.startsWith("UNSUPPORTED_MIME")) throw new AppError(400, "UNSUPPORTED_MIME");
      if (msg.startsWith("FILE_TOO_LARGE")) throw new AppError(400, "FILE_TOO_LARGE");
      if (msg === "EMPTY_FILE") throw new AppError(400, "EMPTY_FILE");
      if (msg === "EXECUTABLE_BLOCKED") throw new AppError(400, "EXECUTABLE_BLOCKED");
      throw new AppError(400, "INVALID_FILE");
    }

    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");

    let storageKey: string | null = null;
    try {
      const stored = await writeStoredFile(file.buffer, safeName);
      storageKey = stored.storageKey;

      const conv = await this.db.workspaceConversation.findUnique({
        where: { workspaceType_workspaceId: { workspaceType, workspaceId } },
        select: { id: true },
      });

      const row = await getMessagingWriteDispatcher(this.db).dispatchMutation({
        surface: "workspace_communication",
        registryKey: "workspace_attachment",
        actor,
        idempotencyKey: `ws-attach:${workspaceType}:${workspaceId}:${safeName}:${Date.now()}`,
        unifiedPrimary: async (tx) => {
          const attachment = await tx.workspaceMessageAttachment.create({
            data: {
              workspaceType,
              workspaceId,
              fileName: safeName,
              storageKey: stored.storageKey,
              mimeType: file.mimeType,
              fileSizeBytes: file.sizeBytes,
              uploadedById: actor.id,
            },
          });
          return { attachment, conversationId: conv?.id };
        },
        buildOutbox: (result) =>
          result.conversationId
            ? [
                buildSocketOutbox("workspace_communication", {
                  event: "messaging:attachment:created",
                  conversationId: result.conversationId,
                  messageId: result.attachment.id,
                  idempotencyKey: `attach:${result.attachment.id}`,
                }),
              ]
            : [],
        legacyOnly: async () => {
          const attachment = await this.db.workspaceMessageAttachment.create({
            data: {
              workspaceType,
              workspaceId,
              fileName: safeName,
              storageKey: stored.storageKey,
              mimeType: file.mimeType,
              fileSizeBytes: file.sizeBytes,
              uploadedById: actor.id,
            },
          });
          if (conv) {
            void getMessagingWriteBridge(this.db)
              .onAttachmentCreated({ conversationId: conv.id, attachmentId: attachment.id })
              .catch(() => undefined);
          }
          return { attachment, conversationId: conv?.id };
        },
      });

      return {
        id: row.attachment.id,
        fileName: row.attachment.fileName,
        mimeType: row.attachment.mimeType,
        fileSizeBytes: row.attachment.fileSizeBytes,
        uploadedAt: row.attachment.createdAt.toISOString(),
      };
    } catch (err) {
      if (storageKey) {
        await deleteStoredFile(storageKey).catch(() => undefined);
      }
      throw err;
    }
  }

  async getAttachmentForDownload(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    attachmentId: string,
    actor: AuthUser,
  ): Promise<{ storageKey: string; fileName: string; mimeType: string; fileSizeBytes: number }> {
    if (!(await canAccessCommWorkspace(this.db, actor, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }

    const row = await this.db.workspaceMessageAttachment.findUnique({
      where: { id: attachmentId },
      include: { message: true },
    });
    if (!row || row.workspaceType !== workspaceType || row.workspaceId !== workspaceId) {
      throw new AppError(404, "ATTACHMENT_NOT_FOUND");
    }

    if (row.messageId && row.message) {
      if (row.message.status === "DELETED") {
        throw new AppError(404, "ATTACHMENT_NOT_FOUND");
      }
      const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
      if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");
      const ctx = await buildVisibilityContext(this.db, resolved);
      if (!canViewMessage(actor, row.message.visibility as MessageVisibility, ctx)) {
        throw new AppError(403, "FORBIDDEN");
      }
    }

    await assertStoredFileExists(row.storageKey).catch(() => {
      logger.warn({ attachmentId: row.id }, "[Comm] attachment file missing on storage");
      throw new AppError(404, "ATTACHMENT_FILE_MISSING");
    });

    return {
      storageKey: row.storageKey,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSizeBytes: row.fileSizeBytes,
    };
  }

  private async createMessage(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: CreateMessagePayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");

    try {
      assertCanCreateVisibility(actor, input.visibility, input.messageType);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "FORBIDDEN";
      throw new AppError(403, msg);
    }

    const mentionIds = await this.resolveMentions(
      input.body,
      input.mentionedUserIds ?? [],
      await buildVisibilityContext(this.db, resolved),
    );

    if (input.clientMessageId) {
      const existingId = await this.findClientMessage(
        resolved,
        actor.id,
        input.clientMessageId,
      );
      if (existingId) return;
    }

    const isInternal =
      input.messageType === "INTERNAL_NOTE" || input.visibility === "ADMIN_ONLY";
    const registryKey = isInternal ? "workspace_internal_note" : "workspace_external_message";
    const idempotencyKey =
      input.clientMessageId ?? `ws:${workspaceType}:${workspaceId}:${actor.id}:${Date.now()}`;
    const link = this.workspaceLink(workspaceType, workspaceId);
    const authorRole = actor.role;

    type CreateResult = {
      msgId: string;
      convId: string;
      notifyPayloads: Array<Parameters<typeof notifyCommEvent>[1]>;
      mentionUserIds: string[];
    };

    try {
      await getMessagingWriteDispatcher(this.db).dispatchMutation<CreateResult>({
        surface: "workspace_communication",
        registryKey,
        actor,
        idempotencyKey,
        unifiedPrimary: async (tx) => {
          if (mentionIds.length) {
            const { registerWiredSurface } = await import(
              "../unified-messaging/messaging-write.registry.js"
            );
            registerWiredSurface("mention");
          }
          const conv = await this.ensureConversationTx(tx, resolved);
          const msg = await tx.workspaceMessage.create({
            data: {
              conversationId: conv.id,
              authorUserId: actor.id,
              messageType: input.messageType,
              visibility: input.visibility,
              body: input.body.trim(),
              parentMessageId: input.parentMessageId ?? null,
              clientMessageId: input.clientMessageId ?? null,
              status: "ACTIVE",
              audienceScope: isInternal ? "INTERNAL" : "EXTERNAL",
              direction: isInternal ? "INTERNAL" : "OUTBOUND",
              channelSource: "WORKSPACE",
            },
          });

          if (mentionIds.length) {
            await tx.workspaceMention.createMany({
              data: mentionIds.map((mentionedUserId) => ({
                messageId: msg.id,
                mentionedUserId,
              })),
              skipDuplicates: true,
            });
          }

          if (input.attachmentIds?.length) {
            await tx.workspaceMessageAttachment.updateMany({
              where: {
                id: { in: input.attachmentIds },
                workspaceType,
                workspaceId,
                uploadedById: actor.id,
                messageId: null,
              },
              data: { messageId: msg.id },
            });
          }

          await this.audit(tx, resolved, actor, "communication.created", {
            messageId: msg.id,
            messageType: input.messageType,
            visibility: input.visibility,
          }, ctx);

          if (TIMELINE_MESSAGE_TYPES.includes(input.messageType)) {
            await this.timeline(tx, resolved.auditWorkspaceId, actor.id, `communication.${input.messageType.toLowerCase()}`, {
              messageId: msg.id,
              body: input.body.slice(0, 200),
            });
          }

          const notifyIds = await this.notifyRecipients(
            tx,
            resolved,
            input.visibility,
            actor.id,
            mentionIds,
          );

          const notifyPayloads: CreateResult["notifyPayloads"] = [];
          if (!isInternal) {
            notifyPayloads.push({
              userIds: notifyIds,
              auditWorkspaceId: resolved.auditWorkspaceId,
              commWorkspaceType: workspaceType,
              commWorkspaceId: workspaceId,
              eventType: "communication.message.created",
              title: authorRole === "SUPPLIER" ? "New supplier message" : "New workspace message",
              message: input.body.slice(0, 120),
              link,
              centerType: authorRole === "SUPPLIER" ? "NEW_SUPPLIER_MESSAGE" : undefined,
              metadata: {
                messageId: msg.id,
                conversationId: conv.id,
                messageVisibility: input.visibility,
              },
              messagingDedup: {
                eventType: "message:new",
                conversationId: conv.id,
                messageId: msg.id,
              },
            });
          }

          for (const uid of mentionIds) {
            if (uid === actor.id) continue;
            const mentionedUser = await tx.user.findUnique({
              where: { id: uid },
              select: { role: true },
            });
            const isBuyer = mentionedUser?.role === "BUYER" || mentionedUser?.role === "ADMIN";
            notifyPayloads.push({
              userIds: [uid],
              auditWorkspaceId: resolved.auditWorkspaceId,
              commWorkspaceType: workspaceType,
              commWorkspaceId: workspaceId,
              eventType: isBuyer ? "communication.mentioned.buyer" : "communication.mentioned.supplier",
              title: isBuyer ? "Buyer mentioned in conversation" : "Supplier mentioned in conversation",
              message: input.body.slice(0, 120),
              link,
              centerType: isBuyer ? "BUYER_MENTIONED" : "SUPPLIER_MENTIONED",
              metadata: { messageId: msg.id, conversationId: conv.id },
              messagingDedup: {
                eventType: "mention",
                conversationId: conv.id,
                messageId: msg.id,
              },
            });
            await this.audit(tx, resolved, actor, "communication.mentioned", { messageId: msg.id, userId: uid }, ctx);
          }

          const parts = await tx.workspaceParticipant.findMany({
            where: { workspaceId: resolved.auditWorkspaceId, leftAt: null },
            select: { userId: true },
          });
          const now = new Date();
          for (const p of parts) {
            if (p.userId === actor.id) continue;
            await tx.workspaceMessageDelivery.create({
              data: { messageId: msg.id, userId: p.userId, sentAt: now },
            });
          }

          return {
            msgId: msg.id,
            convId: conv.id,
            notifyPayloads,
            mentionUserIds: mentionIds,
          };
        },
        buildOutbox: (result) => {
          const events = [
            buildSocketOutbox("workspace_communication", {
              event: "messaging:message:new",
              conversationId: result.convId,
              messageId: result.msgId,
              workspaceId: resolved.auditWorkspaceId,
              audienceScope: isInternal ? "INTERNAL" : "EXTERNAL",
              idempotencyKey,
            }),
          ];
          for (const np of result.notifyPayloads) {
            const dedup = np.messagingDedup;
            events.push(
              buildNotificationOutbox("workspace_communication", {
                idempotencyKey: dedup
                  ? `${dedup.eventType}:${dedup.conversationId}:${dedup.messageId}`
                  : idempotencyKey,
                conversationId: dedup?.conversationId ?? result.convId,
                messageId: dedup?.messageId ?? result.msgId,
                notifyInput: np as Record<string, unknown>,
              }),
            );
          }
          return events;
        },
        legacyOnly: async () => {
          await this.createMessageLegacy(
            workspaceType,
            workspaceId,
            actor,
            input,
            ctx,
            resolved,
            mentionIds,
            isInternal,
          );
          return {
            msgId: "",
            convId: "",
            notifyPayloads: [],
            mentionUserIds: [],
          };
        },
      });
    } catch (e) {
      const prismaCode =
        e && typeof e === "object" && "code" in e
          ? String((e as { code: unknown }).code)
          : "";
      if (input.clientMessageId && prismaCode === "P2002") {
        const existingId = await this.findClientMessage(
          resolved,
          actor.id,
          input.clientMessageId,
        );
        if (existingId) return;
      }
      throw e;
    }
  }

  /** Legacy-primary path for legacy_primary_unified_mirror / legacy_only modes. */
  private async createMessageLegacy(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: CreateMessagePayload,
    ctx: { ip?: string; userAgent?: string } | undefined,
    resolved: ResolvedWorkspace,
    mentionIds: string[],
    isInternal: boolean,
  ) {
    const messageId = await this.db.$transaction(async (tx) => {
      const conv = await this.ensureConversationTx(tx, resolved);
      const msg = await tx.workspaceMessage.create({
        data: {
          conversationId: conv.id,
          authorUserId: actor.id,
          messageType: input.messageType,
          visibility: input.visibility,
          body: input.body.trim(),
          parentMessageId: input.parentMessageId ?? null,
          clientMessageId: input.clientMessageId ?? null,
          status: "ACTIVE",
        },
      });
      if (mentionIds.length) {
        await tx.workspaceMention.createMany({
          data: mentionIds.map((mentionedUserId) => ({
            messageId: msg.id,
            mentionedUserId,
          })),
          skipDuplicates: true,
        });
      }
      if (input.attachmentIds?.length) {
        await tx.workspaceMessageAttachment.updateMany({
          where: {
            id: { in: input.attachmentIds },
            workspaceType,
            workspaceId,
            uploadedById: actor.id,
            messageId: null,
          },
          data: { messageId: msg.id },
        });
      }
      await this.audit(tx, resolved, actor, "communication.created", {
        messageId: msg.id,
        messageType: input.messageType,
        visibility: input.visibility,
      }, ctx);
      const notifyIds = await this.notifyRecipients(
        tx,
        resolved,
        input.visibility,
        actor.id,
        mentionIds,
      );
      const link = this.workspaceLink(workspaceType, workspaceId);
      await notifyCommEvent(tx, {
        userIds: notifyIds,
        auditWorkspaceId: resolved.auditWorkspaceId,
        commWorkspaceType: workspaceType,
        commWorkspaceId: workspaceId,
        eventType: isInternal ? "communication.internal_note" : "communication.message.created",
        title: "New workspace message",
        message: input.body.slice(0, 120),
        link,
        metadata: { messageId: msg.id, conversationId: conv.id },
        messagingDedup: isInternal
          ? undefined
          : { eventType: "message:new", conversationId: conv.id, messageId: msg.id },
      });
      return msg.id;
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(resolved.auditWorkspaceId, SocketEvents.COMMUNICATION_CREATED, {
        workspaceType,
        workspaceId,
        messageId,
      });
    });

    void getMessagingWriteBridge(this.db)
      .onWorkspaceMessageCreated({
        actor,
        workspaceType,
        workspaceId,
        auditWorkspaceId: resolved.auditWorkspaceId,
        messageId,
        body: input.body.trim(),
        messageType: input.messageType,
        visibility: input.visibility,
        clientMessageId: input.clientMessageId,
      })
      .catch(() => undefined);
  }

  private async editMessage(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: EditMessagePayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");
    const msg = await this.loadMessageForActor(input.messageId, actor, resolved);

    if (msg.authorUserId !== actor.id && actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN_NOT_AUTHOR");
    }

    await this.db.$transaction(async (tx) => {
      await tx.workspaceMessage.update({
        where: { id: msg.id },
        data: { body: input.body.trim(), status: "EDITED", editedAt: new Date() },
      });
      await this.audit(tx, resolved, actor, "communication.edited", { messageId: msg.id }, ctx);
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(resolved!.auditWorkspaceId, SocketEvents.COMMUNICATION_UPDATED, {
        workspaceType,
        workspaceId,
        messageId: input.messageId,
      });
    });
  }

  private async deleteMessage(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: DeleteMessagePayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");
    const msg = await this.loadMessageForActor(input.messageId, actor, resolved);

    if (msg.authorUserId !== actor.id && actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN_NOT_AUTHOR");
    }

    await this.db.$transaction(async (tx) => {
      await tx.workspaceMessage.update({
        where: { id: msg.id },
        data: { status: "DELETED", body: "[deleted]" },
      });
      await this.audit(tx, resolved, actor, "communication.deleted", {
        messageId: msg.id,
        reason: input.reason,
      }, ctx);
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(resolved!.auditWorkspaceId, SocketEvents.COMMUNICATION_DELETED, {
        workspaceType,
        workspaceId,
        messageId: input.messageId,
      });
    });
  }

  private async markRead(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: MarkReadPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");
    const msg = await this.loadMessageForActor(input.messageId, actor, resolved);
    const idempotencyKey = `ws-msg-read:${msg.id}:${actor.id}`;

    await getMessagingWriteDispatcher(this.db).dispatchMutation({
      surface: "workspace_communication",
      registryKey: "workspace_mark_read",
      actor,
      idempotencyKey,
      unifiedPrimary: async (tx) => {
        await tx.workspaceReadReceipt.upsert({
          where: { messageId_userId: { messageId: msg.id, userId: actor.id } },
          create: { messageId: msg.id, userId: actor.id },
          update: { readAt: new Date() },
        });
        await this.audit(tx, resolved, actor, "communication.read", { messageId: msg.id }, ctx);
        return {
          conversationId: msg.conversationId,
          messageId: msg.id,
          workspaceId: resolved.auditWorkspaceId,
        };
      },
      buildOutbox: (result) => [
        buildSocketOutbox("workspace_communication", {
          event: "messaging:conversation:read",
          conversationId: result.conversationId,
          messageId: result.messageId,
          workspaceId: result.workspaceId,
          idempotencyKey,
        }),
      ],
      legacyOnly: async () => {
        await this.db.$transaction(async (tx) => {
          await tx.workspaceReadReceipt.upsert({
            where: { messageId_userId: { messageId: msg.id, userId: actor.id } },
            create: { messageId: msg.id, userId: actor.id },
            update: { readAt: new Date() },
          });
          await this.audit(tx, resolved, actor, "communication.read", { messageId: msg.id }, ctx);
        });
        socketBus.scheduleEmit(() => {
          socketBus.emitToWorkspace(resolved.auditWorkspaceId, SocketEvents.COMMUNICATION_READ, {
            workspaceType,
            workspaceId,
            messageId: input.messageId,
            userId: actor.id,
          });
        });
        void getMessagingWriteBridge(this.db)
          .onConversationRead({
            actor,
            conversationId: msg.conversationId,
            workspaceId: resolved.auditWorkspaceId,
          })
          .catch(() => undefined);
        return {
          conversationId: msg.conversationId,
          messageId: msg.id,
          workspaceId: resolved.auditWorkspaceId,
        };
      },
    });
  }

  private async loadMessageForActor(
    messageId: string,
    actor: AuthUser,
    resolved: ResolvedWorkspace,
  ): Promise<MessageRow> {
    const msg = await this.db.workspaceMessage.findUnique({
      where: { id: messageId },
      include: {
        mentions: true,
        readReceipts: true,
        attachments: true,
        conversation: true,
      },
    });
    if (!msg || msg.conversation.workspaceType !== resolved.workspaceType
      || msg.conversation.workspaceId !== resolved.workspaceId) {
      throw new AppError(404, "MESSAGE_NOT_FOUND");
    }
    const ctx = await buildVisibilityContext(this.db, resolved);
    if (!canViewMessage(actor, msg.visibility as never, ctx)) {
      throw new AppError(403, "FORBIDDEN_VISIBILITY");
    }
    return msg;
  }

  private async findClientMessage(
    resolved: ResolvedWorkspace,
    authorUserId: string,
    clientMessageId: string,
  ): Promise<string | null> {
    const conv = await this.db.workspaceConversation.findUnique({
      where: {
        workspaceType_workspaceId: {
          workspaceType: resolved.workspaceType,
          workspaceId: resolved.workspaceId,
        },
      },
      select: { id: true },
    });
    if (!conv) return null;

    const existing = await this.db.workspaceMessage.findFirst({
      where: {
        conversationId: conv.id,
        authorUserId,
        clientMessageId,
        status: { not: "DELETED" },
      },
      select: { id: true },
    });
    return existing?.id ?? null;
  }

  private async ensureConversation(resolved: ResolvedWorkspace) {
    return this.ensureConversationTx(this.db, resolved);
  }

  private async ensureConversationTx(
    tx: Prisma.TransactionClient | PrismaClient,
    resolved: ResolvedWorkspace,
  ) {
    const existing = await tx.workspaceConversation.findUnique({
      where: {
        workspaceType_workspaceId: {
          workspaceType: resolved.workspaceType,
          workspaceId: resolved.workspaceId,
        },
      },
    });
    if (existing) return existing;
    return tx.workspaceConversation.create({
      data: {
        workspaceType: resolved.workspaceType,
        workspaceId: resolved.workspaceId,
      },
    });
  }

  private async notifyRecipients(
    tx: Prisma.TransactionClient,
    resolved: ResolvedWorkspace,
    visibility: MessageVisibility,
    authorId: string,
    mentionIds: string[],
  ): Promise<string[]> {
    const parts = await tx.workspaceParticipant.findMany({
      where: { workspaceId: resolved.auditWorkspaceId, leftAt: null },
      include: { user: { select: { id: true, role: true } } },
    });
    const ctx = await buildVisibilityContext(this.db, resolved);
    const ids = new Set<string>(mentionIds);
    for (const p of parts) {
      if (p.userId === authorId) continue;
      const viewer: AuthUser = { id: p.user.id, email: "", role: p.user.role };
      if (canViewMessage(viewer, visibility, ctx)) ids.add(p.userId);
    }
    const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const a of admins) {
      if (a.id !== authorId && canViewMessage(
        { id: a.id, email: "", role: "ADMIN" },
        visibility,
        ctx,
      )) ids.add(a.id);
    }
    ids.delete(authorId);
    return [...ids];
  }

  private async resolveMentions(
    body: string,
    explicitIds: string[],
    ctx: VisibilityContext,
  ): Promise<string[]> {
    const ids = new Set<string>(explicitIds);
    const handles = [...body.matchAll(/@([a-zA-Z0-9._-]+)/g)].map((m) => m[1].toLowerCase());
    if (handles.length) {
      const roleMap: Record<string, keyof Pick<VisibilityContext, "buyerUserIds" | "supplierUserIds">> = {
        buyer: "buyerUserIds",
        supplier: "supplierUserIds",
        demaxtore: "buyerUserIds",
      };
      for (const h of handles) {
        if (h === "demaxtore") {
          const admins = await this.db.user.findMany({
            where: { id: { in: ctx.participantUserIds }, role: "ADMIN" },
            select: { id: true },
          });
          for (const a of admins) ids.add(a.id);
          continue;
        }
        const key = roleMap[h];
        if (key) {
          for (const uid of ctx[key]) {
            if (ctx.participantUserIds.includes(uid)) ids.add(uid);
          }
        }
      }
    }
    if (!handles.length) return [...ids];

    const users = await this.db.user.findMany({
      where: {
        OR: handles.flatMap((h) => [
          { email: { startsWith: h, mode: "insensitive" as const } },
          { displayName: { contains: h, mode: "insensitive" as const } },
        ]),
      },
      select: { id: true },
    });
    for (const u of users) {
      if (ctx.participantUserIds.includes(u.id)) ids.add(u.id);
    }
    return [...ids];
  }

  private async mapMessages(
    rows: MessageRow[],
    actor: AuthUser,
    ctx: VisibilityContext,
  ): Promise<WorkspaceMessage[]> {
    const userIds = new Set<string>();
    for (const r of rows) {
      if (r.authorUserId) userIds.add(r.authorUserId);
      for (const rr of r.readReceipts) userIds.add(rr.userId);
      for (const m of r.mentions) userIds.add(m.mentionedUserId);
    }
    const users = await this.db.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true, role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => {
      const author = r.authorUserId ? byId.get(r.authorUserId) : null;
      const readByMe = r.readReceipts.some((rr) => rr.userId === actor.id);
      const isSystem = r.messageType === "SYSTEM_EVENT";
      return {
        id: r.id,
        conversationId: r.conversationId,
        authorUserId: r.authorUserId,
        authorName: isSystem ? "DeMaxtore System" : author?.displayName ?? "User",
        authorRole: author?.role ?? "BUYER",
        messageType: r.messageType as WorkspaceMessage["messageType"],
        visibility: r.visibility as WorkspaceMessage["visibility"],
        body: r.status === "DELETED" ? "[deleted]" : r.body,
        status: r.status as WorkspaceMessage["status"],
        parentMessageId: r.parentMessageId,
        mentions: r.mentions.map((m) => ({
          userId: m.mentionedUserId,
          displayName: byId.get(m.mentionedUserId)?.displayName ?? "User",
        })),
        attachments: r.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          fileSizeBytes: a.fileSizeBytes,
          uploadedAt: a.createdAt.toISOString(),
        })),
        readReceipts: r.readReceipts.map((rr) => ({
          userId: rr.userId,
          displayName: byId.get(rr.userId)?.displayName ?? "User",
          readAt: rr.readAt.toISOString(),
        })),
        editedAt: r.editedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        readByMe,
      };
    });
  }

  private workspaceLink(workspaceType: CommWorkspaceType, workspaceId: string): string {
    const seg: Record<CommWorkspaceType, string> = {
      RFQ: "rfq",
      COMMODITYBID: "commoditybid",
      ORDER: "order",
      SHIPMENT: "shipment",
      PO: "po",
      FREIGHTIQ: "order",
    };
    return `/workspace/${seg[workspaceType]}/${workspaceId}`;
  }

  private async audit(
    tx: Prisma.TransactionClient,
    resolved: ResolvedWorkspace,
    actor: AuthUser,
    action: string,
    payload: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const ws = await tx.workspace.findUnique({
      where: { id: resolved.auditWorkspaceId },
      select: { state: true },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: resolved.auditWorkspaceId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        fromState: ws?.state ?? "UNKNOWN",
        toState: ws?.state ?? "UNKNOWN",
        payload: payload as Prisma.InputJsonValue,
        ipAddress: ctx?.ip,
        userAgent: ctx?.userAgent,
      },
    });
  }

  private async timeline(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    actorUserId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    await tx.timelineEvent.create({
      data: {
        workspaceId,
        eventType,
        actorUserId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}
