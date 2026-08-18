import { executeLegacyCompatibleRead } from "./legacy-adapter.service.js";
import { normalizeClarificationsLegacy, normalizeConversationHubLegacy, normalizeDirectChatLegacy, normalizeDirectConversationLegacy, normalizeInboxLegacy, normalizePortfolioLegacy, normalizeSearchResultsLegacy, normalizeWhatsAppInboxLegacy, normalizeWhatsAppMessagesLegacy, normalizeWorkspaceCommunicationLegacy, } from "./legacy-adapter.normalizer.js";
import { UnifiedShadowProjector } from "./unified-shadow-projector.js";
export function createWorkspaceCommunicationAdapter(db) {
    const projector = new UnifiedShadowProjector(db);
    return {
        async getConversation(legacyFn, workspaceType, workspaceId, actor) {
            return executeLegacyCompatibleRead({
                surface: "workspace_communication",
                actor,
                query: { workspaceType, workspaceId },
                legacyReader: legacyFn,
                unifiedReader: () => projector.projectWorkspaceCommunication(workspaceType, workspaceId, actor),
                normalizeLegacy: (r) => normalizeWorkspaceCommunicationLegacy(r),
                normalizeUnified: (r) => r,
            });
        },
        async searchMessages(legacyFn, workspaceType, workspaceId, actor) {
            return executeLegacyCompatibleRead({
                surface: "workspace_communication",
                actor,
                query: { workspaceType, workspaceId, search: true },
                legacyReader: legacyFn,
                unifiedReader: () => projector.projectWorkspaceCommunication(workspaceType, workspaceId, actor),
                normalizeLegacy: (r) => normalizeSearchResultsLegacy("workspace_communication", r),
                normalizeUnified: (r) => r,
            });
        },
    };
}
export function createConversationHubAdapter(db) {
    const projector = new UnifiedShadowProjector(db);
    const shadowRead = (legacyFn, workspaceType, workspaceId, actor, normalizeLegacy) => executeLegacyCompatibleRead({
        surface: "conversation_hub",
        actor,
        query: { workspaceType, workspaceId },
        legacyReader: legacyFn,
        unifiedReader: () => projector.projectWorkspaceCommunication(workspaceType, workspaceId, actor),
        normalizeLegacy,
        normalizeUnified: (r) => {
            const row = r;
            return { ...row, sourceSurface: "conversation_hub" };
        },
    });
    return {
        getHub(legacyFn, workspaceType, workspaceId, actor) {
            return shadowRead(legacyFn, workspaceType, workspaceId, actor, (r) => normalizeConversationHubLegacy(r));
        },
        search(legacyFn, workspaceType, workspaceId, actor) {
            return shadowRead(legacyFn, workspaceType, workspaceId, actor, (r) => normalizeSearchResultsLegacy("conversation_hub", r));
        },
    };
}
export function createWorkspaceInboxAdapter(_db) {
    return {
        async getInbox(legacyFn, actor) {
            return executeLegacyCompatibleRead({
                surface: "workspace_inbox",
                actor,
                query: {},
                legacyReader: legacyFn,
                normalizeLegacy: (r) => normalizeInboxLegacy(r),
            });
        },
    };
}
export function createPortfolioMessagesAdapter(_db) {
    return {
        async listMessages(legacyFn, actor) {
            return executeLegacyCompatibleRead({
                surface: "portfolio_messages",
                actor,
                query: {},
                legacyReader: legacyFn,
                normalizeLegacy: (r) => normalizePortfolioLegacy(r),
            });
        },
    };
}
export function createDirectChatAdapter(db) {
    const projector = new UnifiedShadowProjector(db);
    return {
        async listConversations(legacyFn, actor) {
            return executeLegacyCompatibleRead({
                surface: "direct_chat",
                actor,
                query: {},
                legacyReader: legacyFn,
                normalizeLegacy: (r) => normalizeDirectChatLegacy(r),
            });
        },
        async getConversation(legacyFn, conversationId, actor) {
            return executeLegacyCompatibleRead({
                surface: "direct_chat",
                actor,
                query: { conversationId },
                legacyReader: legacyFn,
                unifiedReader: () => projector.projectDirectChat(conversationId),
                normalizeLegacy: (r) => normalizeDirectConversationLegacy(r),
                normalizeUnified: (r) => r,
            });
        },
    };
}
export function createWhatsAppInboxAdapter(db) {
    const projector = new UnifiedShadowProjector(db);
    return {
        async listConversations(legacyFn, actor) {
            return executeLegacyCompatibleRead({
                surface: "whatsapp_inbox",
                actor,
                query: {},
                legacyReader: legacyFn,
                normalizeLegacy: (r) => normalizeWhatsAppInboxLegacy(r),
            });
        },
        async getMessages(legacyFn, conversationId, actor) {
            return executeLegacyCompatibleRead({
                surface: "whatsapp_inbox",
                actor,
                query: { conversationId },
                legacyReader: legacyFn,
                unifiedReader: () => projector.projectWhatsAppConversation(conversationId),
                normalizeLegacy: (r) => normalizeWhatsAppMessagesLegacy(r),
                normalizeUnified: (r) => r,
            });
        },
    };
}
export function createRfqClarificationsAdapter(db) {
    const projector = new UnifiedShadowProjector(db);
    return {
        async listClarifications(legacyFn, workspaceId, actor) {
            return executeLegacyCompatibleRead({
                surface: "rfq_clarifications",
                actor,
                query: { workspaceId },
                legacyReader: legacyFn,
                unifiedReader: () => projector.projectClarifications(workspaceId),
                normalizeLegacy: (r) => normalizeClarificationsLegacy(r),
                normalizeUnified: (r) => r,
            });
        },
    };
}
//# sourceMappingURL=legacy-adapter.facade.js.map