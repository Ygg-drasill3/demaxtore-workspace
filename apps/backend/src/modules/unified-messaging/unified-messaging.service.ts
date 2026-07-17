import type { PrismaClient } from "@prisma/client";
import type {
  AddContextRequest,
  AssignConversationRequest,
  ConversationListFilters,
  CreateConversationRequest,
  CreateInternalNoteRequest,
  CreateMessageRequest,
} from "@dmx/contracts/unified-messaging";
import type { ConversationPriority, ConversationStatus } from "@dmx/contracts/unified-messaging";
import {
  participantKeyForUser,
  participantKeyForWhatsApp,
} from "./unified-messaging.constants.js";
import {
  MessagingChannelDispatcher,
  WorkspaceChannelAdapter,
  WhatsAppChannelAdapterStub,
} from "./unified-messaging.channel-adapter.js";
import { UnifiedMessagingErrors } from "./unified-messaging.errors.js";
import {
  filterMessagesForUser,
  mapConversationDetail,
  mapConversationSummary,
  mapMessage,
} from "./unified-messaging.mapper.js";
import { UnifiedMessagingPolicy } from "./unified-messaging.policy.js";
import { UnifiedMessagingRepository } from "./unified-messaging.repository.js";
import type { AuthUser } from "./unified-messaging.types.js";
import { getMessagingWriteBridge } from "./messaging-write.bridge.js";
import { getMessagingWriteDispatcher } from "./messaging-write.dispatcher.js";
import { registerWiredSurface, buildSocketOutbox } from "./messaging-write.registry.js";
import { UnifiedMessagingWriteOrchestrator } from "./unified-messaging-write.orchestrator.js";
import { assertCanSendMessages, loadUserMessagingGate } from "../phone-verification/phone-verification.policy.js";

export class UnifiedMessagingService {
  private readonly repo: UnifiedMessagingRepository;
  private readonly policy: UnifiedMessagingPolicy;
  private readonly channelDispatcher: MessagingChannelDispatcher;
  private readonly writeOrchestrator: UnifiedMessagingWriteOrchestrator;
  private readonly writeDispatcher: ReturnType<typeof getMessagingWriteDispatcher>;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new UnifiedMessagingRepository(prisma);
    this.policy = new UnifiedMessagingPolicy(prisma);
    this.channelDispatcher = new MessagingChannelDispatcher([
      new WorkspaceChannelAdapter(),
      new WhatsAppChannelAdapterStub(),
    ]);
    this.writeOrchestrator = new UnifiedMessagingWriteOrchestrator(prisma);
    this.writeDispatcher = getMessagingWriteDispatcher(prisma);
  }

  async listConversations(user: AuthUser, filters: ConversationListFilters) {
    if (!this.policy.canListConversations(user)) {
      throw UnifiedMessagingErrors.cannotAccessConversation();
    }
    const page = await this.repo.listConversations(user, filters);
    return {
      items: page.items.map((c) =>
        mapConversationSummary(c, (c as { unreadCount?: number }).unreadCount ?? 0),
      ),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
  }

  async getConversation(user: AuthUser, conversationId: string) {
    await this.policy.assertConversationAccess(user, conversationId);
    const row = await this.repo.findConversationById(conversationId);
    if (!row) throw UnifiedMessagingErrors.conversationNotFound();
    return mapConversationDetail(row);
  }

  async createConversation(user: AuthUser, input: CreateConversationRequest) {
    const row = await this.repo.createConversation(user, input);
    const loaded = await this.repo.findConversationById(row.id);
    if (!loaded) throw UnifiedMessagingErrors.conversationNotFound();
    return mapConversationDetail(loaded);
  }

  async listMessages(user: AuthUser, conversationId: string, cursor?: string, limit?: number) {
    await this.policy.assertConversationAccess(user, conversationId);
    await this.policy.assertSupplierIsolation(user, conversationId);
    const page = await this.repo.listMessages(conversationId, cursor, limit);
    const canReadInternal = this.policy.canReadAudience(user, "INTERNAL");
    const items = filterMessagesForUser(page.items, canReadInternal).map(mapMessage);
    return { items, nextCursor: page.nextCursor, hasMore: page.hasMore };
  }

  async createMessage(
    user: AuthUser,
    conversationId: string,
    input: CreateMessageRequest,
  ): Promise<{ message: ReturnType<typeof mapMessage>; duplicate: boolean }> {
    assertCanSendMessages(await loadUserMessagingGate(this.prisma, user.id));
    await this.policy.assertConversationAccess(user, conversationId);
    if (!(await this.policy.canSendExternalMessage(user, conversationId))) {
      throw UnifiedMessagingErrors.cannotAccessConversation();
    }

    if (input.clientMessageId) {
      const existing = await this.repo.findMessageByClientId(
        conversationId,
        user.id,
        input.clientMessageId,
      );
      if (existing) return { message: mapMessage(existing), duplicate: true };
    }

    const channel: "WORKSPACE" | "WHATSAPP" =
      input.channel === "WHATSAPP" ? "WHATSAPP" : "WORKSPACE";
    const audienceScope = "EXTERNAL" as const;
    this.policy.assertCanDispatchToChannel(audienceScope, channel);

    registerWiredSurface("general_messages_send");
    const message = await this.writeDispatcher.persistMessageWithOutbox(
      user,
      "unified_api",
      {
        conversationId,
        authorUserId: user.id,
        body: input.body,
        channel,
        messageType: input.messageType ?? "MESSAGE",
        parentMessageId: input.replyToMessageId,
        clientMessageId: input.clientMessageId,
      },
      { idempotencyKey: input.clientMessageId ?? `msg:${conversationId}:${Date.now()}` },
    );
    if (!message) throw UnifiedMessagingErrors.cannotAccessConversation();

    if (channel === "WHATSAPP") {
      await this.channelDispatcher.dispatch("WHATSAPP", {
        conversationId,
        messageId: message.id,
        body: input.body,
        audienceScope,
      });
    } else {
      await this.channelDispatcher.dispatch("WORKSPACE", {
        conversationId,
        messageId: message.id,
        body: input.body,
        audienceScope,
      });
    }

    getMessagingWriteBridge(this.prisma).publishEvent("messaging:message:new", {
      conversationId,
      messageId: message.id,
      idempotencyKey: input.clientMessageId ?? message.id,
      audienceScope: "EXTERNAL",
    });

    return { message: mapMessage(message), duplicate: false };
  }

  async createInternalNote(
    user: AuthUser,
    conversationId: string,
    input: CreateInternalNoteRequest,
  ) {
    if (!this.policy.canCreateInternalNote(user)) {
      throw UnifiedMessagingErrors.internalNoteBlocked();
    }
    await this.policy.assertConversationAccess(user, conversationId);

    const audienceScope = "INTERNAL" as const;
    this.policy.assertCanDispatchToChannel(audienceScope, "WORKSPACE");

    registerWiredSurface("unified_internal_note");
    const message = await this.writeDispatcher.persistMessageWithOutbox(
      user,
      "unified_api",
      {
        conversationId,
        authorUserId: user.id,
        body: input.body,
        parentMessageId: input.replyToMessageId,
        internal: true,
      },
      { idempotencyKey: `note:${conversationId}:${Date.now()}` },
    );
    if (!message) throw UnifiedMessagingErrors.internalNoteBlocked();

    getMessagingWriteBridge(this.prisma).publishEvent("messaging:message:new", {
      conversationId,
      messageId: message.id,
      audienceScope: "INTERNAL",
      idempotencyKey: message.id,
    });

    return mapMessage(message);
  }

  async markConversationRead(user: AuthUser, conversationId: string) {
    await this.policy.assertConversationAccess(user, conversationId);
    await this.writeDispatcher.dispatchMarkRead(
      user,
      "unified_api",
      "conversation_mark_read",
      conversationId,
    );
    return { ok: true };
  }

  async addParticipant(
    user: AuthUser,
    conversationId: string,
    data: {
      userId?: string;
      whatsappContactId?: string;
      participantType: string;
      participantRole?: string;
      companyId?: string;
      displayName?: string;
      phoneE164?: string;
      email?: string;
    },
  ) {
    if (!this.policy.canLinkContext(user)) throw UnifiedMessagingErrors.cannotAccessConversation();
    await this.policy.assertConversationAccess(user, conversationId);

    if (!data.userId && !data.whatsappContactId) {
      throw UnifiedMessagingErrors.participantRequired();
    }

    const participantKey = data.userId
      ? participantKeyForUser(data.userId)
      : participantKeyForWhatsApp(data.whatsappContactId!);

    const existing = await this.repo.findParticipant(conversationId, participantKey);
    if (existing) throw UnifiedMessagingErrors.duplicateParticipant();

    registerWiredSurface("participant_add");
    const row = await this.writeDispatcher.dispatchUnifiedFirst({
      surface: "unified_api",
      actor: user,
      idempotencyKey: `participant:add:${conversationId}:${participantKey}`,
      unified: async (tx) =>
        tx.workspaceConversationParticipant.create({
          data: {
            conversationId,
            participantKey,
            userId: data.userId,
            whatsappContactId: data.whatsappContactId,
            participantType: data.participantType,
            participantRole: data.participantRole,
            companyId: data.companyId,
            displayName: data.displayName,
            phoneE164: data.phoneE164,
            email: data.email,
          },
        }),
      outbox: (row) => [
        buildSocketOutbox("unified_api", {
          event: "messaging:participant:updated",
          conversationId,
          idempotencyKey: `participant:${row.id}`,
        }),
      ],
    });

    return row;
  }

  async removeParticipant(user: AuthUser, conversationId: string, participantId: string) {
    if (!this.policy.canLinkContext(user)) throw UnifiedMessagingErrors.cannotAccessConversation();
    await this.policy.assertConversationAccess(user, conversationId);
    registerWiredSurface("participant_remove");
    await this.writeDispatcher.dispatchUnifiedFirst({
      surface: "unified_api",
      actor: user,
      idempotencyKey: `participant:remove:${participantId}`,
      unified: async (tx) => {
        await tx.workspaceConversationParticipant.update({
          where: { id: participantId, conversationId },
          data: { leftAt: new Date() },
        });
        return { participantId };
      },
      outbox: () => [
        buildSocketOutbox("unified_api", {
          event: "messaging:participant:updated",
          conversationId,
          idempotencyKey: `participant:remove:${participantId}`,
        }),
      ],
    });
    return { ok: true };
  }

  async addContext(user: AuthUser, conversationId: string, input: AddContextRequest) {
    if (!this.policy.canLinkContext(user)) throw UnifiedMessagingErrors.cannotLinkContext();
    await this.policy.assertConversationAccess(user, conversationId);
    registerWiredSurface("context_add");
    const row = await this.writeDispatcher.dispatchUnifiedFirst({
      surface: "unified_api",
      actor: user,
      idempotencyKey: `context:add:${conversationId}:${input.contextType}:${input.contextId}`,
      unified: async (tx) =>
        tx.conversationContext.create({
          data: {
            conversationId,
            contextType: input.contextType,
            contextId: input.contextId,
            contextReference: input.contextReference,
            metadata: (input.metadata ?? {}) as import("@prisma/client").Prisma.InputJsonValue,
            createdById: user.id,
          },
        }),
      outbox: (row) => [
        buildSocketOutbox("unified_api", {
          event: "messaging:context:updated",
          conversationId,
          idempotencyKey: `context:${row.id}`,
        }),
      ],
    });
    return row;
  }

  async removeContext(user: AuthUser, conversationId: string, contextId: string) {
    if (!this.policy.canLinkContext(user)) throw UnifiedMessagingErrors.cannotLinkContext();
    await this.policy.assertConversationAccess(user, conversationId);
    registerWiredSurface("context_remove");
    await this.writeDispatcher.dispatchUnifiedFirst({
      surface: "unified_api",
      actor: user,
      idempotencyKey: `context:remove:${contextId}`,
      unified: async (tx) => {
        await tx.conversationContext.delete({ where: { id: contextId } });
        return { contextId };
      },
      outbox: () => [
        buildSocketOutbox("unified_api", {
          event: "messaging:context:updated",
          conversationId,
          idempotencyKey: `context:remove:${contextId}`,
        }),
      ],
    });
    return { ok: true };
  }

  async assignConversation(
    user: AuthUser,
    conversationId: string,
    input: AssignConversationRequest,
  ) {
    if (!this.policy.canAssignConversation(user)) {
      throw UnifiedMessagingErrors.cannotAssign();
    }
    registerWiredSurface("conversation_assignment");
    registerWiredSurface("team_assignment");
    await this.writeDispatcher.dispatchConversationMutation(
      user,
      "unified_api",
      "conversation_assignment",
      conversationId,
      `assign:${conversationId}:${input.assignedUserId}`,
      { assignedUserId: input.assignedUserId },
      "messaging:conversation:assigned",
    );
    return this.getConversation(user, conversationId);
  }

  async archiveConversation(user: AuthUser, conversationId: string) {
    if (!this.policy.canArchiveConversation(user)) {
      throw UnifiedMessagingErrors.cannotArchive();
    }
    registerWiredSurface("archive");
    await this.writeDispatcher.dispatchConversationMutation(
      user,
      "unified_api",
      "archive",
      conversationId,
      `archive:${conversationId}`,
      { isArchived: true, status: "ARCHIVED" },
      "messaging:conversation:archived",
    );
    return this.getConversation(user, conversationId);
  }

  async unarchiveConversation(user: AuthUser, conversationId: string) {
    if (!this.policy.canArchiveConversation(user)) {
      throw UnifiedMessagingErrors.cannotArchive();
    }
    registerWiredSurface("unarchive");
    await this.writeDispatcher.dispatchConversationMutation(
      user,
      "unified_api",
      "unarchive",
      conversationId,
      `unarchive:${conversationId}`,
      { isArchived: false, status: "ACTIVE" },
      "messaging:conversation:updated",
    );
    return this.getConversation(user, conversationId);
  }

  async updatePriority(user: AuthUser, conversationId: string, priority: ConversationPriority) {
    if (!this.policy.canAssignConversation(user)) throw UnifiedMessagingErrors.cannotAssign();
    await this.policy.assertConversationAccess(user, conversationId);
    registerWiredSurface("priority_update");
    await this.writeDispatcher.dispatchConversationMutation(
      user,
      "unified_api",
      "priority_update",
      conversationId,
      `priority:${conversationId}:${priority}`,
      { priority },
      "messaging:conversation:updated",
    );
    return this.getConversation(user, conversationId);
  }

  async updateStatus(user: AuthUser, conversationId: string, status: ConversationStatus) {
    if (!this.policy.canAssignConversation(user)) throw UnifiedMessagingErrors.cannotAssign();
    await this.policy.assertConversationAccess(user, conversationId);
    registerWiredSurface("conversation_status_update");
    await this.writeDispatcher.dispatchConversationMutation(
      user,
      "unified_api",
      "conversation_status_update",
      conversationId,
      `status:${conversationId}:${status}`,
      { status },
      "messaging:conversation:updated",
    );
    return this.getConversation(user, conversationId);
  }

  async retryMessage(user: AuthUser, conversationId: string, messageId: string) {
    await this.policy.assertConversationAccess(user, conversationId);
    if (!this.policy.canSendExternalMessage(user, conversationId)) {
      throw UnifiedMessagingErrors.cannotAccessConversation();
    }
    registerWiredSurface("message_retry");
    const msg = await this.prisma.workspaceMessage.findFirst({
      where: { id: messageId, conversationId },
    });
    if (!msg?.failedAt) throw UnifiedMessagingErrors.conversationNotFound();

    const retried = await this.writeDispatcher.dispatchUnifiedFirst({
      surface: "unified_api",
      actor: user,
      idempotencyKey: `retry:${messageId}`,
      unified: async (tx) =>
        tx.workspaceMessage.update({
          where: { id: messageId },
          data: { failedAt: null, sentAt: new Date() },
        }),
      outbox: () => [
        buildSocketOutbox("unified_api", {
          event: "messaging:message:status",
          conversationId,
          messageId,
          idempotencyKey: `retry:${messageId}`,
        }),
      ],
    });
    return mapMessage(retried);
  }
}
