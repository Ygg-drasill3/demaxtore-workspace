import type { PrismaClient } from "@prisma/client";
import type { MessageAudienceScope } from "@dmx/contracts/unified-messaging";
import {
  ADMIN_MESSAGING_ROLES,
  participantKeyForUser,
  SALES_MANAGER_ROLES,
} from "./unified-messaging.constants.js";
import { UnifiedMessagingErrors } from "./unified-messaging.errors.js";
import type { AuthUser } from "./unified-messaging.types.js";

export class UnifiedMessagingPolicy {
  constructor(private readonly prisma: PrismaClient) {}

  canListConversations(user: AuthUser): boolean {
    return true;
  }

  async canAccessConversation(user: AuthUser, conversationId: string): Promise<boolean> {
    if (this.isOwnerOrAdmin(user)) return true;
    const participant = await this.prisma.workspaceConversationParticipant.findFirst({
      where: { conversationId, userId: user.id, leftAt: null },
    });
    return Boolean(participant);
  }

  async canReadMessage(
    user: AuthUser,
    conversationId: string,
    audienceScope: MessageAudienceScope,
  ): Promise<boolean> {
    if (!this.canReadAudience(user, audienceScope)) return false;
    return this.canAccessConversation(user, conversationId);
  }

  canReadAudience(user: AuthUser, audienceScope: MessageAudienceScope): boolean {
    if (this.isStaff(user)) return true;
    if (audienceScope === "INTERNAL" || audienceScope === "SYSTEM") return false;
    return true;
  }

  async canSendExternalMessage(user: AuthUser, conversationId: string): Promise<boolean> {
    if (user.role === "BUYER" || user.role === "SUPPLIER") {
      return this.canAccessConversation(user, conversationId);
    }
    if (this.isStaff(user)) return true;
    return false;
  }

  canCreateInternalNote(user: AuthUser): boolean {
    return this.isStaff(user);
  }

  canAssignConversation(user: AuthUser): boolean {
    return (
      SALES_MANAGER_ROLES.includes(user.role as (typeof SALES_MANAGER_ROLES)[number]) ||
      user.role === "OPS_MANAGER"
    );
  }

  canArchiveConversation(user: AuthUser): boolean {
    return ADMIN_MESSAGING_ROLES.includes(user.role as (typeof ADMIN_MESSAGING_ROLES)[number]);
  }

  canLinkContext(user: AuthUser): boolean {
    return this.isStaff(user);
  }

  assertCanDispatchToChannel(audienceScope: MessageAudienceScope, channel: string): void {
    if (channel === "WHATSAPP" && audienceScope !== "EXTERNAL") {
      throw UnifiedMessagingErrors.whatsappBlocked();
    }
    if (audienceScope === "INTERNAL" && channel !== "WORKSPACE") {
      throw UnifiedMessagingErrors.internalNoteBlocked();
    }
    if (audienceScope === "SYSTEM" && channel === "WHATSAPP") {
      throw UnifiedMessagingErrors.whatsappBlocked();
    }
  }

  async assertConversationAccess(user: AuthUser, conversationId: string): Promise<void> {
    if (!(await this.canAccessConversation(user, conversationId))) {
      throw UnifiedMessagingErrors.cannotAccessConversation();
    }
  }

  async assertSupplierIsolation(
    user: AuthUser,
    conversationId: string,
  ): Promise<void> {
    if (user.role !== "SUPPLIER") return;
    const participant = await this.prisma.workspaceConversationParticipant.findFirst({
      where: {
        conversationId,
        userId: user.id,
        leftAt: null,
        participantKey: participantKeyForUser(user.id),
      },
    });
    if (!participant) throw UnifiedMessagingErrors.notParticipant();
  }

  private isOwnerOrAdmin(user: AuthUser): boolean {
    return ADMIN_MESSAGING_ROLES.includes(user.role as (typeof ADMIN_MESSAGING_ROLES)[number]);
  }

  private isStaff(user: AuthUser): boolean {
    return (
      this.isOwnerOrAdmin(user) ||
      user.role === "SALES_CONTROL" ||
      user.role === "OPS_MANAGER"
    );
  }
}
