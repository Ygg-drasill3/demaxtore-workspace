import type { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "../../config/logger.js";
import { getUnifiedMessagingWriteMode } from "../../config/env.js";
import { UnifiedMessagingWriteOrchestrator } from "./unified-messaging-write.orchestrator.js";
import { getMessagingOutboxService, type EnqueueOutboxInput } from "./messaging-outbox.service.js";
import type { AuthUser } from "./unified-messaging.types.js";
import type { MessagingWriteSurface } from "./messaging-write.bridge.js";
import { buildSocketOutbox, registerWiredSurface, type MessagingMutationSurface } from "./messaging-write.registry.js";

export type WriteMode =
  | "legacy_only"
  | "legacy_primary_unified_mirror"
  | "unified_primary_legacy_mirror"
  | "unified_only";

export interface DispatchLegacyInput<T> {
  surface: MessagingWriteSurface;
  actor: AuthUser;
  idempotencyKey: string;
  legacy: () => Promise<T>;
  afterLegacy?: (result: T) => Promise<void>;
  mirrorPayload?: (result: T) => {
    conversationId?: string;
    messageId?: string;
    mirrorInput: Parameters<UnifiedMessagingWriteOrchestrator["mirrorFromLegacy"]>[1];
    legacy: { legacyId: string; legacySource: string };
  } | null;
  socketEvents?: Array<{
    event: Parameters<import("./messaging-write.bridge.js").MessagingEventEmitter["emit"]>[0];
    payload: Parameters<import("./messaging-write.bridge.js").MessagingEventEmitter["emit"]>[1];
  }>;
}

export interface DispatchUnifiedInput<T> {
  surface: MessagingWriteSurface;
  actor: AuthUser;
  idempotencyKey: string;
  unified: (tx: Prisma.TransactionClient) => Promise<T>;
  outbox?: (result: T) => EnqueueOutboxInput[];
  legacyMirror?: (result: T) => Promise<{ legacyId: string; legacySource: string }>;
  socketEvents?: DispatchLegacyInput<T>["socketEvents"];
}

/** Central write-mode dispatcher — primary persistence + transactional outbox. */
export class MessagingWriteDispatcher {
  private readonly orchestrator: UnifiedMessagingWriteOrchestrator;
  private readonly outbox: ReturnType<typeof getMessagingOutboxService>;

  constructor(private readonly prisma: PrismaClient) {
    this.orchestrator = new UnifiedMessagingWriteOrchestrator(prisma);
    this.outbox = getMessagingOutboxService(prisma);
  }

  get writeMode(): WriteMode {
    return getUnifiedMessagingWriteMode() as WriteMode;
  }

  /** Legacy-first path (workspace comm, direct chat, whatsapp, rfq, system). */
  async dispatchLegacyFirst<T>(input: DispatchLegacyInput<T>): Promise<T> {
    const mode = this.writeMode;
    if (mode === "legacy_only" || mode === "legacy_primary_unified_mirror" || mode === "unified_primary_legacy_mirror") {
      const result = await input.legacy();
      try {
        if (input.afterLegacy) await input.afterLegacy(result);
      } catch (err) {
        logger.warn({ err: String(err), surface: input.surface }, "dispatchLegacyFirst afterLegacy failed");
        const mirror = input.mirrorPayload?.(result);
        if (mirror && mode === "unified_primary_legacy_mirror") {
          await this.enqueueMirrorRetry(input.surface, input.actor, mirror, input.idempotencyKey);
        }
      }
      return result;
    }

    // unified_only: legacy path should not be primary — delegate to unified if afterLegacy provides mirror
    const result = await input.legacy();
    if (input.afterLegacy) {
      try {
        await input.afterLegacy(result);
      } catch (err) {
        logger.warn({ err: String(err), surface: input.surface }, "dispatchLegacyFirst unified_only hook failed");
      }
    }
    return result;
  }

  /** Unified-first path (unified API mutations, assign, archive, etc.). */
  async dispatchUnifiedFirst<T>(input: DispatchUnifiedInput<T>): Promise<T> {
    const mode = this.writeMode;
    if (mode === "legacy_only") {
      throw new Error("UNIFIED_WRITE_BLOCKED_IN_LEGACY_ONLY");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const value = await input.unified(tx);
      const events = input.outbox?.(value) ?? [];
      for (const evt of events) {
        await this.outbox.enqueue(evt, tx);
      }
      return value;
    });

    const mode2 = this.writeMode;
    if (mode2 === "unified_primary_legacy_mirror" && input.legacyMirror) {
      void input.legacyMirror(result).catch((err) => {
        logger.warn({ err: String(err), surface: input.surface }, "legacy mirror async failed");
      });
    }

    return result;
  }

  /** Persist unified message in transaction with optional mirror outbox. */
  async persistMessageWithOutbox(
    actor: AuthUser,
    surface: MessagingWriteSurface,
    input: Parameters<UnifiedMessagingWriteOrchestrator["writeFromUnifiedApi"]>[1] & { internal?: boolean },
    opts?: { idempotencyKey?: string; legacyMirror?: () => Promise<{ legacyId: string; legacySource: string }> },
  ) {
    const idempotencyKey = opts?.idempotencyKey ?? `msg:${input.conversationId}:${input.clientMessageId ?? Date.now()}`;
    return this.dispatchUnifiedFirst({
      surface,
      actor,
      idempotencyKey,
      unified: async () => this.orchestrator.writeFromUnifiedApi(actor, input),
      outbox: (msg) => {
        if (!msg) return [];
        const events: EnqueueOutboxInput[] = [
          {
            eventType: "SOCKET_EMIT",
            aggregateType: surface,
            aggregateId: msg.id,
            conversationId: input.conversationId,
            messageId: msg.id,
            idempotencyKey: `socket:${idempotencyKey}`,
            payload: {
              event: "messaging:message:new",
              eventPayload: {
                conversationId: input.conversationId,
                messageId: msg.id,
                idempotencyKey,
              },
            },
          },
        ];
        const mode = this.writeMode;
        if (mode === "unified_primary_legacy_mirror" && opts?.legacyMirror) {
          events.push({
            eventType: "LEGACY_MIRROR",
            aggregateType: surface,
            aggregateId: msg.id,
            conversationId: input.conversationId,
            messageId: msg.id,
            idempotencyKey: `mirror:${idempotencyKey}`,
            payload: {
              actor,
              mirrorInput: {
                conversationId: input.conversationId,
                authorUserId: input.authorUserId,
                body: input.body,
                channel: input.channel,
                messageType: input.messageType,
                visibility: input.visibility,
                parentMessageId: input.parentMessageId,
                clientMessageId: input.clientMessageId,
              },
              legacy: { legacyId: msg.id, legacySource: surface },
            },
          });
        }
        return events;
      },
    });
  }

  /** Conversation metadata mutation with transactional outbox. */
  async dispatchConversationMutation(
    user: AuthUser,
    surface: MessagingWriteSurface,
    registryKey: MessagingMutationSurface,
    conversationId: string,
    idempotencyKey: string,
    data: Prisma.WorkspaceConversationUpdateInput,
    socket: Parameters<typeof buildSocketOutbox>[1]["event"],
  ) {
    registerWiredSurface(registryKey);
    return this.dispatchUnifiedFirst({
      surface,
      actor: user,
      idempotencyKey,
      unified: async (tx) => {
        await tx.workspaceConversation.update({ where: { id: conversationId }, data });
        return { conversationId };
      },
      outbox: () => [
        buildSocketOutbox(surface, {
          event: socket,
          conversationId,
          idempotencyKey,
        }),
      ],
    });
  }

  /** Mark conversation read with outbox socket event. */
  async dispatchMarkRead(
    user: AuthUser,
    surface: MessagingWriteSurface,
    registryKey: MessagingMutationSurface,
    conversationId: string,
  ) {
    registerWiredSurface(registryKey);
    return this.dispatchUnifiedFirst({
      surface,
      actor: user,
      idempotencyKey: `read:${conversationId}:${user.id}`,
      unified: async (tx) => {
        await tx.workspaceConversationParticipant.updateMany({
          where: { conversationId, userId: user.id },
          data: { lastReadAt: new Date() },
        });
        return { conversationId };
      },
      outbox: () => [
        buildSocketOutbox(surface, {
          event: "messaging:conversation:read",
          conversationId,
          idempotencyKey: `read:${conversationId}:${user.id}`,
        }),
      ],
    });
  }

  private async enqueueMirrorRetry(
    surface: MessagingWriteSurface,
    actor: AuthUser,
    mirror: NonNullable<ReturnType<NonNullable<DispatchLegacyInput<unknown>["mirrorPayload"]>>>,
    idempotencyKey: string,
  ) {
    await this.outbox.enqueue({
      eventType: "LEGACY_MIRROR",
      aggregateType: surface,
      aggregateId: mirror.messageId ?? idempotencyKey,
      conversationId: mirror.conversationId,
      messageId: mirror.messageId,
      idempotencyKey: `mirror:${idempotencyKey}`,
      payload: {
        actor,
        mirrorInput: mirror.mirrorInput,
        legacy: mirror.legacy,
      },
    });
  }
}

let dispatcher: MessagingWriteDispatcher | null = null;

export function getMessagingWriteDispatcher(prisma: PrismaClient): MessagingWriteDispatcher {
  if (!dispatcher) dispatcher = new MessagingWriteDispatcher(prisma);
  return dispatcher;
}
