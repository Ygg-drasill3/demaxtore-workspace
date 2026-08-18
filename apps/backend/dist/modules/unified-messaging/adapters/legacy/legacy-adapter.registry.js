import { createConversationHubAdapter, createDirectChatAdapter, createPortfolioMessagesAdapter, createRfqClarificationsAdapter, createWhatsAppInboxAdapter, createWorkspaceCommunicationAdapter, createWorkspaceInboxAdapter, } from "./legacy-adapter.facade.js";
export function toMessagingActor(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role === "SYSTEM" ? "ADMIN" : user.role,
    };
}
export function createLegacyMessagingAdapters(db) {
    return {
        workspaceCommunication: createWorkspaceCommunicationAdapter(db),
        conversationHub: createConversationHubAdapter(db),
        workspaceInbox: createWorkspaceInboxAdapter(db),
        portfolioMessages: createPortfolioMessagesAdapter(db),
        directChat: createDirectChatAdapter(db),
        whatsappInbox: createWhatsAppInboxAdapter(db),
        rfqClarifications: createRfqClarificationsAdapter(db),
    };
}
let cachedAdapters = null;
export function getLegacyMessagingAdapters(db) {
    if (!cachedAdapters)
        cachedAdapters = createLegacyMessagingAdapters(db);
    return cachedAdapters;
}
//# sourceMappingURL=legacy-adapter.registry.js.map