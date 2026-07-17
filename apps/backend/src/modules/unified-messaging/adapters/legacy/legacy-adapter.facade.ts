import type { PrismaClient } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import type { AuthUser } from "../../unified-messaging.types.js";
import type { NormalizedMessagingResult } from "./legacy-adapter.types.js";
import { executeLegacyCompatibleRead } from "./legacy-adapter.service.js";
import {
  normalizeClarificationsLegacy,
  normalizeConversationHubLegacy,
  normalizeDirectChatLegacy,
  normalizeDirectConversationLegacy,
  normalizeInboxLegacy,
  normalizePortfolioLegacy,
  normalizeSearchResultsLegacy,
  normalizeWhatsAppInboxLegacy,
  normalizeWhatsAppMessagesLegacy,
  normalizeWorkspaceCommunicationLegacy,
} from "./legacy-adapter.normalizer.js";
import { UnifiedShadowProjector } from "./unified-shadow-projector.js";

export function createWorkspaceCommunicationAdapter(db: PrismaClient) {
  const projector = new UnifiedShadowProjector(db);

  return {
    async getConversation(
      legacyFn: () => Promise<unknown>,
      workspaceType: CommWorkspaceType,
      workspaceId: string,
      actor: AuthUser,
    ) {
      return executeLegacyCompatibleRead({
        surface: "workspace_communication",
        actor,
        query: { workspaceType, workspaceId },
        legacyReader: legacyFn,
        unifiedReader: () => projector.projectWorkspaceCommunication(workspaceType, workspaceId, actor),
        normalizeLegacy: (r) => normalizeWorkspaceCommunicationLegacy(r as never),
        normalizeUnified: (r) => r as never,
      });
    },

    async searchMessages(
      legacyFn: () => Promise<unknown>,
      workspaceType: CommWorkspaceType,
      workspaceId: string,
      actor: AuthUser,
    ) {
      return executeLegacyCompatibleRead({
        surface: "workspace_communication",
        actor,
        query: { workspaceType, workspaceId, search: true },
        legacyReader: legacyFn,
        unifiedReader: () => projector.projectWorkspaceCommunication(workspaceType, workspaceId, actor),
        normalizeLegacy: (r) => normalizeSearchResultsLegacy("workspace_communication", r as never),
        normalizeUnified: (r) => r as never,
      });
    },
  };
}

export function createConversationHubAdapter(db: PrismaClient) {
  const projector = new UnifiedShadowProjector(db);

  const shadowRead = (
    legacyFn: () => Promise<unknown>,
    workspaceType: CommWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    normalizeLegacy: (r: unknown) => ReturnType<typeof normalizeConversationHubLegacy>,
  ) =>
    executeLegacyCompatibleRead({
      surface: "conversation_hub",
      actor,
      query: { workspaceType, workspaceId },
      legacyReader: legacyFn,
      unifiedReader: () => projector.projectWorkspaceCommunication(workspaceType, workspaceId, actor),
      normalizeLegacy,
      normalizeUnified: (r) => {
        const row = r as NormalizedMessagingResult;
        return { ...row, sourceSurface: "conversation_hub" as const };
      },
    });

  return {
    getHub(
      legacyFn: () => Promise<unknown>,
      workspaceType: CommWorkspaceType,
      workspaceId: string,
      actor: AuthUser,
    ) {
      return shadowRead(legacyFn, workspaceType, workspaceId, actor, (r) =>
        normalizeConversationHubLegacy(r as never),
      );
    },

    search(
      legacyFn: () => Promise<unknown>,
      workspaceType: CommWorkspaceType,
      workspaceId: string,
      actor: AuthUser,
    ) {
      return shadowRead(legacyFn, workspaceType, workspaceId, actor, (r) =>
        normalizeSearchResultsLegacy("conversation_hub", r as never),
      );
    },
  };
}

export function createWorkspaceInboxAdapter(_db?: PrismaClient) {
  return {
    async getInbox(legacyFn: () => Promise<unknown>, actor: AuthUser) {
      return executeLegacyCompatibleRead({
        surface: "workspace_inbox",
        actor,
        query: {},
        legacyReader: legacyFn,
        normalizeLegacy: (r) => normalizeInboxLegacy(r as never),
      });
    },
  };
}

export function createPortfolioMessagesAdapter(_db?: PrismaClient) {
  return {
    async listMessages(legacyFn: () => Promise<unknown>, actor: AuthUser) {
      return executeLegacyCompatibleRead({
        surface: "portfolio_messages",
        actor,
        query: {},
        legacyReader: legacyFn,
        normalizeLegacy: (r) => normalizePortfolioLegacy(r as never),
      });
    },
  };
}

export function createDirectChatAdapter(db: PrismaClient) {
  const projector = new UnifiedShadowProjector(db);

  return {
    async listConversations(legacyFn: () => Promise<unknown>, actor: AuthUser) {
      return executeLegacyCompatibleRead({
        surface: "direct_chat",
        actor,
        query: {},
        legacyReader: legacyFn,
        normalizeLegacy: (r) => normalizeDirectChatLegacy(r),
      });
    },

    async getConversation(
      legacyFn: () => Promise<unknown>,
      conversationId: string,
      actor: AuthUser,
    ) {
      return executeLegacyCompatibleRead({
        surface: "direct_chat",
        actor,
        query: { conversationId },
        legacyReader: legacyFn,
        unifiedReader: () => projector.projectDirectChat(conversationId),
        normalizeLegacy: (r) => normalizeDirectConversationLegacy(r as never),
        normalizeUnified: (r) => r as never,
      });
    },
  };
}

export function createWhatsAppInboxAdapter(db: PrismaClient) {
  const projector = new UnifiedShadowProjector(db);

  return {
    async listConversations(legacyFn: () => Promise<unknown>, actor: AuthUser) {
      return executeLegacyCompatibleRead({
        surface: "whatsapp_inbox",
        actor,
        query: {},
        legacyReader: legacyFn,
        normalizeLegacy: (r) => normalizeWhatsAppInboxLegacy(r as never),
      });
    },

    async getMessages(
      legacyFn: () => Promise<unknown>,
      conversationId: string,
      actor: AuthUser,
    ) {
      return executeLegacyCompatibleRead({
        surface: "whatsapp_inbox",
        actor,
        query: { conversationId },
        legacyReader: legacyFn,
        unifiedReader: () => projector.projectWhatsAppConversation(conversationId),
        normalizeLegacy: (r) => normalizeWhatsAppMessagesLegacy(r as never),
        normalizeUnified: (r) => r as never,
      });
    },
  };
}

export function createRfqClarificationsAdapter(db: PrismaClient) {
  const projector = new UnifiedShadowProjector(db);

  return {
    async listClarifications(legacyFn: () => Promise<unknown>, workspaceId: string, actor: AuthUser) {
      return executeLegacyCompatibleRead({
        surface: "rfq_clarifications",
        actor,
        query: { workspaceId },
        legacyReader: legacyFn,
        unifiedReader: () => projector.projectClarifications(workspaceId),
        normalizeLegacy: (r) => normalizeClarificationsLegacy(r as never),
        normalizeUnified: (r) => r as never,
      });
    },
  };
}
