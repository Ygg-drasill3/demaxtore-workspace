import type { PrismaClient } from "@prisma/client";
import type { AuthUser as GlobalAuthUser } from "../../../../types/auth-user.js";
import type { AuthUser as MessagingAuthUser } from "../../unified-messaging.types.js";
import {
  createConversationHubAdapter,
  createDirectChatAdapter,
  createPortfolioMessagesAdapter,
  createRfqClarificationsAdapter,
  createWhatsAppInboxAdapter,
  createWorkspaceCommunicationAdapter,
  createWorkspaceInboxAdapter,
} from "./legacy-adapter.facade.js";

export function toMessagingActor(user: GlobalAuthUser): MessagingAuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role === "SYSTEM" ? "ADMIN" : user.role,
  };
}

export function createLegacyMessagingAdapters(db: PrismaClient) {
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

let cachedAdapters: ReturnType<typeof createLegacyMessagingAdapters> | null = null;

export function getLegacyMessagingAdapters(db: PrismaClient) {
  if (!cachedAdapters) cachedAdapters = createLegacyMessagingAdapters(db);
  return cachedAdapters;
}
