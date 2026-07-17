import type { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "../../config/logger.js";
import { getUnifiedMessagingWriteMode } from "../../config/env.js";
import { UnifiedMessagingRepository } from "./unified-messaging.repository.js";
import { UnifiedMessagingPolicy } from "./unified-messaging.policy.js";
import {
  channelToColumn,
  defaultDirectionForAudience,
} from "./unified-messaging.constants.js";
import { mergeCanonicalStatus, mapWhatsAppStatusToCanonical } from "./messaging-status.js";
import type { AuthUser } from "./unified-messaging.types.js";

export interface CreateExternalMessageInput {
  conversationId: string;
  authorUserId: string;
  body: string;
  channel?: "WORKSPACE" | "WHATSAPP";
  messageType?: string;
  visibility?: string;
  parentMessageId?: string;
  clientMessageId?: string;
  legacyMirror?: () => Promise<{ legacyId: string; legacySource: string }>;
}

export interface MirrorFailureMetric {
  surface: string;
  reason: string;
}

export class UnifiedMessagingWriteOrchestrator {
  private readonly repo: UnifiedMessagingRepository;
  private readonly policy: UnifiedMessagingPolicy;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new UnifiedMessagingRepository(prisma);
    this.policy = new UnifiedMessagingPolicy(prisma);
  }

  get writeMode() {
    return getUnifiedMessagingWriteMode();
  }

  async createExternalMessage(user: AuthUser, input: CreateExternalMessageInput) {
    const mode = this.writeMode;
    const channel = input.channel ?? "WORKSPACE";
    const audienceScope = "EXTERNAL" as const;
    this.policy.assertCanDispatchToChannel(audienceScope, channel);

    if (mode === "legacy_only") {
      if (!input.legacyMirror) throw new Error("LEGACY_MIRROR_REQUIRED");
      const legacy = await input.legacyMirror();
      const existing = await this.repo.findMessageByLegacy(legacy.legacySource, legacy.legacyId);
      if (existing) return existing;
      throw new Error("LEGACY_ONLY_MODE");
    }

    if (mode === "legacy_primary_unified_mirror") {
      const legacy = await input.legacyMirror!();
      void this.mirrorToUnified(user, input, legacy).catch((err) => {
        logger.warn({ err: String(err), surface: "external_message" }, "unified mirror failed");
      });
      const row = await this.repo.findMessageByLegacy(legacy.legacySource, legacy.legacyId);
      return row;
    }

    const unified = await this.persistUnifiedMessage({
      conversationId: input.conversationId,
      authorUserId: input.authorUserId,
      body: input.body,
      messageType: input.messageType ?? "MESSAGE",
      visibility: input.visibility ?? "ALL_PARTICIPANTS",
      audienceScope,
      direction: defaultDirectionForAudience(audienceScope),
      channelSource: channelToColumn(channel),
      parentMessageId: input.parentMessageId,
      clientMessageId: input.clientMessageId,
    });

    if (mode === "unified_primary_legacy_mirror" && input.legacyMirror) {
      void input.legacyMirror().catch((err) => {
        logger.warn({ err: String(err), messageId: unified.id }, "legacy mirror failed");
      });
    }

    return unified;
  }

  async createInternalNote(user: AuthUser, input: Omit<CreateExternalMessageInput, "channel">) {
    if (!this.policy.canCreateInternalNote(user)) {
      throw new Error("INTERNAL_NOTE_BLOCKED");
    }
    const audienceScope = "INTERNAL" as const;
    this.policy.assertCanDispatchToChannel(audienceScope, "WORKSPACE");

    const mode = this.writeMode;
    if (mode === "legacy_only" || mode === "legacy_primary_unified_mirror") {
      if (!input.legacyMirror) throw new Error("LEGACY_MIRROR_REQUIRED");
      const legacy = await input.legacyMirror();
      if (mode === "legacy_primary_unified_mirror") {
        void this.mirrorToUnified(
          user,
          { ...input, channel: "WORKSPACE", messageType: "INTERNAL_NOTE", visibility: "ADMIN_ONLY" },
          legacy,
        ).catch((err) => {
          logger.warn({ err: String(err), surface: "internal_note" }, "unified mirror failed");
        });
      }
      return null;
    }

    return this.persistUnifiedMessage({
      conversationId: input.conversationId,
      authorUserId: input.authorUserId,
      body: input.body,
      messageType: "INTERNAL_NOTE",
      visibility: "ADMIN_ONLY",
      audienceScope,
      direction: "INTERNAL",
      channelSource: "WORKSPACE",
      parentMessageId: input.parentMessageId,
    });
  }

  async updateDeliveryStatus(
    messageId: string,
    incomingStatus: string,
    timestamps?: { sentAt?: Date; deliveredAt?: Date; readAt?: Date; failedAt?: Date },
  ) {
    const msg = await this.prisma.workspaceMessage.findUnique({ where: { id: messageId } });
    if (!msg) return null;

    const current = msg.readAt
      ? "READ"
      : msg.deliveredAt
        ? "DELIVERED"
        : msg.sentAt
          ? "SENT"
          : "PENDING";
    const incoming = mapWhatsAppStatusToCanonical(incomingStatus);
    const merged = mergeCanonicalStatus(current as never, incoming);

    const data: Prisma.WorkspaceMessageUpdateInput = {};
    if (merged === "SENT" && timestamps?.sentAt) data.sentAt = timestamps.sentAt;
    if (merged === "DELIVERED" && timestamps?.deliveredAt) data.deliveredAt = timestamps.deliveredAt;
    if (merged === "READ" && timestamps?.readAt) data.readAt = timestamps.readAt;
    if (merged === "FAILED" && timestamps?.failedAt) data.failedAt = timestamps.failedAt;

    if (Object.keys(data).length === 0) return msg;
    return this.prisma.workspaceMessage.update({ where: { id: messageId }, data });
  }

  async mirrorFromLegacy(
    user: AuthUser,
    input: CreateExternalMessageInput,
    legacy: { legacyId: string; legacySource: string },
  ) {
    if (this.writeMode !== "legacy_primary_unified_mirror") return null;
    try {
      return await this.mirrorToUnified(user, input, legacy);
    } catch (err) {
      logger.warn({ err: String(err), surface: "mirror_from_legacy" }, "unified mirror failed");
      return null;
    }
  }

  private async persistUnifiedMessage(data: {
    conversationId: string;
    authorUserId: string;
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
  }) {
    return this.repo.createMessage(data);
  }

  private async mirrorToUnified(
    user: AuthUser,
    input: CreateExternalMessageInput,
    legacy: { legacyId: string; legacySource: string },
  ) {
    const existing = await this.repo.findMessageByLegacy(legacy.legacySource, legacy.legacyId);
    if (existing) return existing;
    return this.persistUnifiedMessage({
      conversationId: input.conversationId,
      authorUserId: input.authorUserId,
      body: input.body,
      messageType: input.messageType ?? "MESSAGE",
      visibility: input.visibility ?? "ALL_PARTICIPANTS",
      audienceScope: "EXTERNAL",
      direction: defaultDirectionForAudience("EXTERNAL"),
      channelSource: channelToColumn(input.channel ?? "WORKSPACE"),
      parentMessageId: input.parentMessageId,
      clientMessageId: input.clientMessageId,
      legacySource: legacy.legacySource,
      legacyId: legacy.legacyId,
    });
  }
}
