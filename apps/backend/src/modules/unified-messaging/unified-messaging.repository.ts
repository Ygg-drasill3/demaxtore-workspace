import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ConversationListFilters,
  CreateConversationRequest,
} from "@dmx/contracts/unified-messaging";
import { randomUUID } from "node:crypto";
import {
  participantKeyForUser,
  participantKeyForWhatsApp,
} from "./unified-messaging.constants.js";
import type { AuthUser } from "./unified-messaging.types.js";

function workspaceTypesForContext(contextType: string): string[] {
  switch (contextType) {
    case "COMMODITY_BID":
      return ["COMMODITYBID"];
    case "SMART_CONTAINER":
      return ["MIXED_CONTAINER"];
    case "MIXED_CONTAINER":
      return ["MIXED_CONTAINER"];
    case "BULK_CONTAINER":
      return ["BULK_CONTAINER"];
    case "PURCHASE_ORDER":
      return ["ORDER"];
    default:
      return [contextType];
  }
}

export class UnifiedMessagingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findConversationById(id: string) {
    return this.prisma.workspaceConversation.findUnique({
      where: { id },
      include: {
        participants: { where: { leftAt: null } },
        contexts: true,
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
  }

  async listConversations(user: AuthUser, filters: ConversationListFilters) {
    const limit = filters.limit ?? 30;
    const where: Record<string, unknown> = {};

    if (filters.archived === true) where.isArchived = true;
    else if (filters.archived === false) where.isArchived = false;

    if (filters.status) where.status = filters.status;
    if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;
    if (filters.channel) where.primaryChannel = filters.channel;

    if (filters.contextType && filters.contextId) {
      const workspaceTypes = workspaceTypesForContext(filters.contextType);
      const contextMatch = {
        OR: [
          {
            contexts: {
              some: { contextType: filters.contextType, contextId: filters.contextId },
            },
          },
          {
            workspaceId: filters.contextId,
            workspaceType: { in: workspaceTypes },
          },
        ],
      };
      if (filters.search) {
        where.AND = [
          contextMatch,
          {
            OR: [
              { subject: { contains: filters.search, mode: "insensitive" } },
              { messages: { some: { body: { contains: filters.search, mode: "insensitive" } } } },
            ],
          },
        ];
      } else {
        where.OR = contextMatch.OR;
      }
    } else if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
        { messages: { some: { body: { contains: filters.search, mode: "insensitive" } } } },
      ];
    }

    if (!this.isStaff(user)) {
      where.participants = { some: { userId: user.id, leftAt: null } };
    } else if (filters.participantId) {
      where.participants = { some: { userId: filters.participantId, leftAt: null } };
    }

    if (filters.companyId) {
      where.participants = {
        some: { companyId: filters.companyId, leftAt: null },
      };
    }

    if (filters.cursor) {
      where.id = { lt: filters.cursor };
    }

    const items = await this.prisma.workspaceConversation.findMany({
      where,
      include: {
        participants: { where: { leftAt: null } },
        contexts: true,
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;
    const unreadMap = await this.batchUnreadCounts(
      user.id,
      page.map((c) => c.id),
    );
    return {
      items: page.map((c) => ({ ...c, unreadCount: unreadMap.get(c.id) ?? 0 })),
      nextCursor,
      hasMore,
    };
  }

  private async batchUnreadCounts(userId: string, conversationIds: string[]) {
    const map = new Map<string, number>();
    if (!conversationIds.length) return map;

    type Row = { conversation_id: string; cnt: bigint };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT m.conversation_id, COUNT(*)::bigint AS cnt
      FROM workspace_messages m
      INNER JOIN workspace_conversation_participants p
        ON p.conversation_id = m.conversation_id
        AND p.user_id = ${userId}::uuid
        AND p.left_at IS NULL
      WHERE m.conversation_id = ANY(${conversationIds}::uuid[])
        AND m.status = 'ACTIVE'
        AND m.audience_scope = 'EXTERNAL'
        AND (m.author_user_id IS NULL OR m.author_user_id != ${userId}::uuid)
        AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
      GROUP BY m.conversation_id
    `;
    for (const row of rows) {
      map.set(row.conversation_id, Number(row.cnt));
    }
    for (const id of conversationIds) {
      if (!map.has(id)) map.set(id, 0);
    }
    return map;
  }

  async createConversation(user: AuthUser, input: CreateConversationRequest) {
    return this.prisma.workspaceConversation.create({
      data: {
        workspaceType: input.workspaceType ?? "GENERAL",
        workspaceId: input.workspaceId ?? randomUUID(),
        subject: input.subject,
        priority: input.priority ?? "NORMAL",
        primaryChannel: input.primaryChannel ?? "WORKSPACE",
        metadata: {},
        contexts: input.contexts?.length
          ? {
              create: input.contexts.map((c) => ({
                contextType: c.contextType,
                contextId: c.contextId,
                contextReference: c.contextReference,
                metadata: (c.metadata ?? {}) as Prisma.InputJsonValue,
                createdById: user.id,
              })),
            }
          : undefined,
        participants: {
          create: [
            {
              participantKey: participantKeyForUser(user.id),
              userId: user.id,
              participantType: "USER",
              participantRole: "OWNER",
            },
            ...(input.participants ?? []).map((p) => ({
              participantKey: p.userId
                ? participantKeyForUser(p.userId)
                : p.whatsappContactId
                  ? participantKeyForWhatsApp(p.whatsappContactId)
                  : `custom:${randomUUID()}`,
              userId: p.userId,
              whatsappContactId: p.whatsappContactId,
              participantType: p.participantType,
              participantRole: p.participantRole ?? "MEMBER",
              companyId: p.companyId,
              displayName: p.displayName,
              phoneE164: p.phoneE164,
              email: p.email,
            })),
          ],
        },
      },
      include: {
        participants: true,
        contexts: true,
        messages: true,
      },
    });
  }

  async listMessages(conversationId: string, cursor?: string, limit = 50) {
    const messages = await this.prisma.workspaceMessage.findMany({
      where: {
        conversationId,
        status: "ACTIVE",
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });
    const hasMore = messages.length > limit;
    const page = hasMore ? messages.slice(0, limit) : messages;
    return {
      items: page.reverse(),
      nextCursor: hasMore ? page[0]?.id ?? null : null,
      hasMore,
    };
  }

  async createMessage(data: {
    conversationId: string;
    /** Null for system-generated messages — `author_user_id` is a nullable uuid. */
    authorUserId: string | null;
    body: string;
    messageType: string;
    visibility: string;
    audienceScope: string;
    direction: string;
    channelSource: string;
    parentMessageId?: string;
    clientMessageId?: string;
    legacySource?: string;
    legacyId?: string;
    externalMessageId?: string;
    whatsappMessageId?: string;
    systemEventKey?: string;
    sentAt?: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.workspaceMessage.create({ data });
      await tx.workspaceConversation.update({
        where: { id: data.conversationId },
        data: {
          lastMessageAt: new Date(),
          ...(data.audienceScope === "EXTERNAL"
            ? { lastExternalMessageAt: new Date() }
            : {}),
          ...(data.direction === "INBOUND"
            ? { lastInboundMessageAt: new Date() }
            : {}),
        },
      });
      return message;
    });
  }

  async findMessageByLegacy(legacySource: string, legacyId: string) {
    return this.prisma.workspaceMessage.findFirst({
      where: { legacySource, legacyId },
    });
  }

  async findMessageByClientId(
    conversationId: string,
    authorUserId: string | null,
    clientMessageId: string,
  ) {
    return this.prisma.workspaceMessage.findFirst({
      where: { conversationId, authorUserId, clientMessageId },
    });
  }

  async findMessageByExternalId(externalMessageId: string) {
    return this.prisma.workspaceMessage.findFirst({
      where: { externalMessageId },
    });
  }

  async addParticipant(
    conversationId: string,
    data: {
      participantKey: string;
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
    return this.prisma.workspaceConversationParticipant.create({
      data: { conversationId, ...data },
    });
  }

  async findParticipant(conversationId: string, participantKey: string) {
    return this.prisma.workspaceConversationParticipant.findUnique({
      where: {
        conversationId_participantKey: { conversationId, participantKey },
      },
    });
  }

  async addContext(
    conversationId: string,
    data: {
      contextType: string;
      contextId: string;
      contextReference?: string;
      metadata?: Record<string, unknown>;
      createdById: string;
    },
  ) {
    return this.prisma.conversationContext.create({
      data: {
        conversationId,
        contextType: data.contextType,
        contextId: data.contextId,
        contextReference: data.contextReference,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
        createdById: data.createdById,
      },
    });
  }

  async removeContext(contextId: string) {
    return this.prisma.conversationContext.delete({ where: { id: contextId } });
  }

  async markConversationRead(conversationId: string, userId: string) {
    await this.prisma.workspaceConversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  async assignConversation(conversationId: string, assignedUserId: string) {
    return this.prisma.workspaceConversation.update({
      where: { id: conversationId },
      data: { assignedUserId },
    });
  }

  async archiveConversation(conversationId: string) {
    return this.prisma.workspaceConversation.update({
      where: { id: conversationId },
      data: { isArchived: true, status: "ARCHIVED" },
    });
  }

  private isStaff(user: AuthUser) {
    return ["SUPER_ADMIN", "ADMIN", "OPS_MANAGER", "SALES_CONTROL"].includes(user.role);
  }
}
