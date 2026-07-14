import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CommWorkspaceType,
  MessageVisibility,
} from "@dmx/contracts/workspace-communication";
import type {
  ConversationHub,
  ConversationParticipant,
  ConversationSearchResult,
  DeliveryState,
  TimelineItem,
} from "@dmx/contracts/conversation-hub";
import type { CreateTimelineItemInput } from "@dmx/contracts/conversation-hub.zod";
import { ConversationSearchQuerySchema } from "@dmx/contracts/conversation-hub.zod";
import type { z } from "zod";
import { CommunicationService } from "../workspace-communication/communication.service.js";
import {
  buildVisibilityContext,
  canAccessCommWorkspace,
  resolveWorkspace,
  type AuthUser,
} from "../workspace-communication/communication.policy.js";
import { canViewMessage } from "../workspace-communication/communication.visibility.js";
import { bootstrapWorkspaceConversation } from "./conversation-bootstrap.js";
import {
  buildAttachmentLibrary,
  buildDecisionLog,
  buildHeader,
  buildPendingActions,
  buildSummary,
  getPinnedItems,
  loadWorkspaceOperationalContext,
} from "./conversation-hub.operational.js";
import { AppError } from "../../utils/httpErrors.js";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";

type SearchQuery = z.infer<typeof ConversationSearchQuerySchema>;

type MessageRow = Prisma.WorkspaceMessageGetPayload<{
  include: {
    mentions: true;
    readReceipts: true;
    deliveries: true;
    attachments: true;
  };
}>;

export class ConversationHubService {
  private comm: CommunicationService;

  constructor(private readonly db: PrismaClient) {
    this.comm = new CommunicationService(db);
  }

  async getHub(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
  ): Promise<ConversationHub> {
    if (!(await canAccessCommWorkspace(this.db, actor, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");

    await bootstrapWorkspaceConversation(this.db, workspaceType, workspaceId);

    const conv = await this.db.workspaceConversation.findUniqueOrThrow({
      where: {
        workspaceType_workspaceId: { workspaceType, workspaceId },
      },
    });

    const ctx = await buildVisibilityContext(this.db, resolved);
    const rows = await this.db.workspaceMessage.findMany({
      where: { conversationId: conv.id, status: { not: "DELETED" } },
      orderBy: { createdAt: "asc" },
      include: {
        mentions: true,
        readReceipts: true,
        deliveries: true,
        attachments: true,
      },
    });

    const visible = rows.filter((m) => canViewMessage(actor, m.visibility as MessageVisibility, ctx));
    const timeline = await this.mapTimeline(visible, actor, ctx);
    const participants = await this.loadParticipants(resolved);

    const unreadCount = timeline.filter(
      (t) => !t.readByMe && t.authorUserId !== actor.id && !t.isSystemEvent,
    ).length;

    const opCtx = await loadWorkspaceOperationalContext(this.db, workspaceType, resolved.auditWorkspaceId);
    const pendingActions = buildPendingActions(timeline);
    const decisions = buildDecisionLog(timeline);
    const attachmentLibrary = buildAttachmentLibrary(timeline);
    const pinnedItems = getPinnedItems(timeline);
    const summary = buildSummary(
      opCtx.workspaceStatus,
      opCtx.supplierName,
      opCtx.shipmentStatus,
      timeline,
      pendingActions,
    );
    const header = buildHeader(
      workspaceType,
      workspaceId,
      opCtx.workspaceRef,
      opCtx.workspaceStatus,
      participants,
      timeline,
      unreadCount,
      pendingActions.length,
    );

    return {
      id: conv.id,
      workspaceType,
      workspaceId,
      auditWorkspaceId: resolved.auditWorkspaceId,
      status: conv.status,
      createdAt: conv.createdAt.toISOString(),
      participants,
      timeline,
      unreadCount,
      header,
      summary,
      pendingActions,
      decisions,
      attachmentLibrary,
      pinnedItems,
    };
  }

  async search(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    query: SearchQuery,
  ): Promise<ConversationSearchResult> {
    const hub = await this.getHub(workspaceType, workspaceId, actor);
    let items = hub.timeline;

    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter((t) => t.body.toLowerCase().includes(q));
    }
    if (query.participantUserId) {
      items = items.filter((t) => t.authorUserId === query.participantUserId);
    }
    if (query.itemType) {
      items = items.filter((t) => t.itemType === query.itemType);
    }
    if (query.dateFrom) {
      const from = new Date(query.dateFrom);
      items = items.filter((t) => new Date(t.createdAt) >= from);
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      items = items.filter((t) => new Date(t.createdAt) <= to);
    }
    if (query.fileName) {
      const fn = query.fileName.toLowerCase();
      items = items.filter((t) =>
        t.attachments.some((a) => a.fileName.toLowerCase().includes(fn)),
      );
    }

    const total = items.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    items = items.slice(offset, offset + limit);

    return { items, total };
  }

  async createTimelineItem(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: CreateTimelineItemInput,
  ) {
    await this.comm.applyCommunicationAction(
      workspaceType,
      workspaceId,
      "create_message",
      actor,
      {
        body: input.body,
        messageType: input.itemType,
        visibility: input.visibility ?? "ALL_PARTICIPANTS",
        parentMessageId: input.parentMessageId,
        attachmentIds: input.attachmentIds,
        mentionedUserIds: input.mentionedUserIds,
      },
    );

    const hub = await this.getHub(workspaceType, workspaceId, actor);
    const last = hub.timeline.at(-1);
    if (last) {
      await this.ensureDeliveries(last.id, workspaceType, workspaceId, actor.id);
    }
    return hub;
  }

  async markDelivered(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    messageId: string,
  ) {
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");

    await this.db.workspaceMessageDelivery.upsert({
      where: { messageId_userId: { messageId, userId: actor.id } },
      create: {
        messageId,
        userId: actor.id,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
      update: { deliveredAt: new Date() },
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(resolved.auditWorkspaceId, SocketEvents.COMMUNICATION_READ, {
        workspaceType,
        workspaceId,
        messageId,
        userId: actor.id,
      });
    });

    return { ok: true };
  }

  async markRead(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    messageId: string,
  ) {
    await this.comm.applyCommunicationAction(workspaceType, workspaceId, "mark_read", actor, {
      messageId,
    });

    await this.db.workspaceMessageDelivery.upsert({
      where: { messageId_userId: { messageId, userId: actor.id } },
      create: {
        messageId,
        userId: actor.id,
        sentAt: new Date(),
        deliveredAt: new Date(),
        readAt: new Date(),
      },
      update: { deliveredAt: new Date(), readAt: new Date() },
    });

    return { ok: true };
  }

  async setPinned(
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    messageId: string,
    pinned: boolean,
  ) {
    if (!(await canAccessCommWorkspace(this.db, actor, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }

    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) throw new AppError(404, "WORKSPACE_NOT_FOUND");

    const msg = await this.db.workspaceMessage.findFirst({
      where: {
        id: messageId,
        conversation: {
          workspaceType,
          workspaceId,
        },
      },
    });
    if (!msg) throw new AppError(404, "MESSAGE_NOT_FOUND");

    const meta = (msg.metadata as Record<string, unknown>) ?? {};
    await this.db.workspaceMessage.update({
      where: { id: messageId },
      data: {
        metadata: {
          ...meta,
          pinned,
          pinnedAt: pinned ? new Date().toISOString() : null,
          pinnedBy: pinned ? actor.id : null,
        },
      },
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(resolved.auditWorkspaceId, SocketEvents.COMMUNICATION_UPDATED, {
        workspaceType,
        workspaceId,
        messageId,
      });
    });

    return this.getHub(workspaceType, workspaceId, actor);
  }

  private async ensureDeliveries(
    messageId: string,
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    authorId: string,
  ) {
    const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
    if (!resolved) return;

    const parts = await this.db.workspaceParticipant.findMany({
      where: { workspaceId: resolved.auditWorkspaceId, leftAt: null },
      select: { userId: true },
    });

    const now = new Date();
    for (const p of parts) {
      if (p.userId === authorId) continue;
      await this.db.workspaceMessageDelivery.upsert({
        where: { messageId_userId: { messageId, userId: p.userId } },
        create: { messageId, userId: p.userId, sentAt: now },
        update: {},
      });
    }
  }

  private async loadParticipants(
    resolved: { auditWorkspaceId: string; workspaceType: CommWorkspaceType; workspaceId: string },
  ): Promise<ConversationParticipant[]> {
    const parts = await this.db.workspaceParticipant.findMany({
      where: { workspaceId: resolved.auditWorkspaceId, leftAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            whatsappPhone: true,
            organisation: { select: { name: true } },
          },
        },
      },
    });

    const out: ConversationParticipant[] = [];
    const seen = new Set<string>();

    for (const p of parts) {
      if (seen.has(p.userId)) continue;
      seen.add(p.userId);
      let role: ConversationParticipant["role"];
      if (p.participantRole === "OPERATOR" || ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER"].includes(p.user.role)) {
        role = "DEMAXTORE_REPRESENTATIVE";
      } else if (p.user.role === "BUYER") {
        role = "BUYER";
      } else {
        role = "SUPPLIER";
      }
      out.push(this.mapParticipant(p.user, role));
    }

    return out;
  }

  private mapParticipant(
    user: {
      id: string;
      email: string;
      displayName: string | null;
      whatsappPhone: string | null;
      organisation: { name: string } | null;
    },
    role: ConversationParticipant["role"],
  ): ConversationParticipant {
    return {
      userId: user.id,
      fullName: user.displayName ?? user.email.split("@")[0] ?? "User",
      company: user.organisation?.name ?? null,
      role,
      email: user.email,
      whatsapp: user.whatsappPhone,
      preferredLanguage: "en",
      timeZone: "UTC",
    };
  }

  private async mapTimeline(
    rows: MessageRow[],
    actor: AuthUser,
    ctx: Awaited<ReturnType<typeof buildVisibilityContext>>,
  ): Promise<TimelineItem[]> {
    const authorIds = [...new Set(rows.map((r) => r.authorUserId).filter(Boolean))] as string[];
    const authors = authorIds.length
      ? await this.db.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, displayName: true, email: true, role: true },
        })
      : [];
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    const mentionUserIds = [...new Set(rows.flatMap((r) => r.mentions.map((m) => m.mentionedUserId)))];
    const mentionUsers = mentionUserIds.length
      ? await this.db.user.findMany({
          where: { id: { in: mentionUserIds } },
          select: { id: true, displayName: true, email: true, role: true },
        })
      : [];
    const mentionMap = new Map(mentionUsers.map((u) => [u.id, u]));

    return rows.map((row) => {
      const author = row.authorUserId ? authorMap.get(row.authorUserId) : null;
      const meta = (row.metadata as Record<string, unknown>) ?? {};
      const isSystemEvent = row.messageType === "SYSTEM_EVENT";
      const myDelivery = row.deliveries.find((d) => d.userId === actor.id);
      const readByMe = Boolean(
        row.readReceipts.some((r) => r.userId === actor.id) || myDelivery?.readAt,
      );
      const pinned = Boolean(meta.pinned);
      const pinnedAt = typeof meta.pinnedAt === "string" ? meta.pinnedAt : null;

      return {
        id: row.id,
        conversationId: row.conversationId,
        itemType: row.messageType as TimelineItem["itemType"],
        body: row.body,
        authorUserId: row.authorUserId,
        authorName: isSystemEvent
          ? "DeMaxtore System"
          : author?.displayName ?? author?.email?.split("@")[0] ?? null,
        authorRole: author?.role ?? null,
        visibility: row.visibility,
        channelSource: row.channelSource,
        isSystemEvent,
        systemEventType: (meta.systemEventType as TimelineItem["systemEventType"]) ?? null,
        metadata: meta,
        parentMessageId: row.parentMessageId,
        attachments: row.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          fileSizeBytes: a.fileSizeBytes,
          uploadedAt: a.createdAt.toISOString(),
        })),
        deliveryStatuses: row.deliveries.map((d) => ({
          userId: d.userId,
          state: this.deliveryState(d),
          sentAt: d.sentAt.toISOString(),
          deliveredAt: d.deliveredAt?.toISOString() ?? null,
          readAt: d.readAt?.toISOString() ?? null,
        })),
        mentions: row.mentions.map((m) => {
          const u = mentionMap.get(m.mentionedUserId);
          return {
            userId: m.mentionedUserId,
            displayName: u?.displayName ?? u?.email?.split("@")[0] ?? "User",
            roleAlias:
              u?.role === "BUYER"
                ? "BUYER"
                : u?.role === "SUPPLIER"
                  ? "SUPPLIER"
                  : u?.role === "ADMIN"
                    ? "DEMAXTORE_REPRESENTATIVE"
                    : undefined,
          };
        }),
        pinned,
        pinnedAt,
        editedAt: row.editedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        readByMe,
      };
    });
  }

  private deliveryState(d: {
    deliveredAt: Date | null;
    readAt: Date | null;
  }): DeliveryState {
    if (d.readAt) return "READ";
    if (d.deliveredAt) return "DELIVERED";
    return "SENT";
  }
}
