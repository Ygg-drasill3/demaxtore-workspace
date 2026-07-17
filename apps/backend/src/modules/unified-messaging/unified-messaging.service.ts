import type { PrismaClient } from "@prisma/client";
import type {
  AddContextRequest,
  AssignConversationRequest,
  ConversationListFilters,
  CreateConversationRequest,
  CreateInternalNoteRequest,
  CreateMessageRequest,
} from "@dmx/contracts/unified-messaging";
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
import { UnifiedMessagingWriteOrchestrator } from "./unified-messaging-write.orchestrator.js";

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
  ) {
    await this.policy.assertConversationAccess(user, conversationId);
    if (!(await this.policy.canSendExternalMessage(user, conversationId))) {
      throw UnifiedMessagingErrors.cannotAccessConversation();
    }

    const channel: "WORKSPACE" | "WHATSAPP" =
      input.channel === "WHATSAPP" ? "WHATSAPP" : "WORKSPACE";
    const audienceScope = "EXTERNAL" as const;
    this.policy.assertCanDispatchToChannel(audienceScope, channel);

    const message = await this.writeOrchestrator.writeFromUnifiedApi(user, {
      conversationId,
      authorUserId: user.id,
      body: input.body,
      channel,
      messageType: input.messageType ?? "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      parentMessageId: input.replyToMessageId,
      clientMessageId: input.clientMessageId,
    });
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

    const bridge = getMessagingWriteBridge(this.prisma);
    bridge.publishEvent("messaging:message:new", {
      conversationId,
      messageId: message.id,
      idempotencyKey: input.clientMessageId ?? message.id,
      audienceScope: "EXTERNAL",
    });

    return mapMessage(message);
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

    const message = await this.writeOrchestrator.writeFromUnifiedApi(user, {
      conversationId,
      authorUserId: user.id,
      body: input.body,
      parentMessageId: input.replyToMessageId,
      internal: true,
    });
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
    await this.repo.markConversationRead(conversationId, user.id);
    void getMessagingWriteBridge(this.prisma)
      .onConversationRead({ actor: user, conversationId })
      .catch(() => undefined);
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

    const row = await this.repo.addParticipant(conversationId, {
      participantKey,
      userId: data.userId,
      whatsappContactId: data.whatsappContactId,
      participantType: data.participantType,
      participantRole: data.participantRole,
      companyId: data.companyId,
      displayName: data.displayName,
      phoneE164: data.phoneE164,
      email: data.email,
    });

    void getMessagingWriteBridge(this.prisma)
      .onParticipantUpdated({ conversationId, participantId: row.id })
      .catch(() => undefined);

    return row;
  }

  async removeParticipant(user: AuthUser, conversationId: string, participantId: string) {
    if (!this.policy.canLinkContext(user)) throw UnifiedMessagingErrors.cannotAccessConversation();
    await this.prisma.workspaceConversationParticipant.update({
      where: { id: participantId, conversationId },
      data: { leftAt: new Date() },
    });
    return { ok: true };
  }

  async addContext(user: AuthUser, conversationId: string, input: AddContextRequest) {
    if (!this.policy.canLinkContext(user)) throw UnifiedMessagingErrors.cannotLinkContext();
    await this.policy.assertConversationAccess(user, conversationId);
    const row = await this.repo.addContext(conversationId, {
      contextType: input.contextType,
      contextId: input.contextId,
      contextReference: input.contextReference,
      metadata: input.metadata,
      createdById: user.id,
    });
    void getMessagingWriteBridge(this.prisma)
      .onContextUpdated({ conversationId, contextId: row.id })
      .catch(() => undefined);
    return row;
  }

  async removeContext(user: AuthUser, conversationId: string, contextId: string) {
    if (!this.policy.canLinkContext(user)) throw UnifiedMessagingErrors.cannotLinkContext();
    await this.policy.assertConversationAccess(user, conversationId);
    await this.repo.removeContext(contextId);
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
    await this.writeDispatcher.dispatchUnifiedFirst({
      surface: "unified_api",
      actor: user,
      idempotencyKey: `assign:${conversationId}:${input.assignedUserId}`,
      unified: async (tx) => {
        await tx.workspaceConversation.update({
          where: { id: conversationId },
          data: { assignedUserId: input.assignedUserId },
        });
        return { conversationId, assignedUserId: input.assignedUserId };
      },
      outbox: () => [
        {
          eventType: "SOCKET_EMIT",
          aggregateType: "unified_api",
          aggregateId: conversationId,
          conversationId,
          idempotencyKey: `socket:assign:${conversationId}:${input.assignedUserId}`,
          payload: {
            event: "messaging:conversation:assigned",
            eventPayload: {
              conversationId,
              idempotencyKey: `assign:${conversationId}:${input.assignedUserId}`,
            },
          },
        },
      ],
    });
    return this.getConversation(user, conversationId);
  }

  async archiveConversation(user: AuthUser, conversationId: string) {
    if (!this.policy.canArchiveConversation(user)) {
      throw UnifiedMessagingErrors.cannotArchive();
    }
    await this.writeDispatcher.dispatchUnifiedFirst({
      surface: "unified_api",
      actor: user,
      idempotencyKey: `archive:${conversationId}`,
      unified: async (tx) => {
        await tx.workspaceConversation.update({
          where: { id: conversationId },
          data: { isArchived: true, status: "ARCHIVED" },
        });
        return { conversationId };
      },
      outbox: () => [
        {
          eventType: "SOCKET_EMIT",
          aggregateType: "unified_api",
          aggregateId: conversationId,
          conversationId,
          idempotencyKey: `socket:archive:${conversationId}`,
          payload: {
            event: "messaging:conversation:archived",
            eventPayload: { conversationId, idempotencyKey: `archive:${conversationId}` },
          },
        },
      ],
    });
    return this.getConversation(user, conversationId);
  }
}
