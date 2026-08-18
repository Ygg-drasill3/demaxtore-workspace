import { ADMIN_MESSAGING_ROLES, participantKeyForUser, SALES_MANAGER_ROLES, } from "./unified-messaging.constants.js";
import { UnifiedMessagingErrors } from "./unified-messaging.errors.js";
export class UnifiedMessagingPolicy {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    canListConversations(user) {
        return true;
    }
    async canAccessConversation(user, conversationId) {
        if (this.isOwnerOrAdmin(user))
            return true;
        const participant = await this.prisma.workspaceConversationParticipant.findFirst({
            where: { conversationId, userId: user.id, leftAt: null },
        });
        return Boolean(participant);
    }
    async canReadMessage(user, conversationId, audienceScope) {
        if (!this.canReadAudience(user, audienceScope))
            return false;
        return this.canAccessConversation(user, conversationId);
    }
    canReadAudience(user, audienceScope) {
        if (this.isStaff(user))
            return true;
        if (audienceScope === "INTERNAL" || audienceScope === "SYSTEM")
            return false;
        return true;
    }
    async canSendExternalMessage(user, conversationId) {
        if (user.role === "BUYER" || user.role === "SUPPLIER") {
            return this.canAccessConversation(user, conversationId);
        }
        if (this.isStaff(user))
            return true;
        return false;
    }
    canCreateInternalNote(user) {
        return this.isStaff(user);
    }
    canAssignConversation(user) {
        return (SALES_MANAGER_ROLES.includes(user.role) ||
            user.role === "OPS_MANAGER");
    }
    canArchiveConversation(user) {
        return ADMIN_MESSAGING_ROLES.includes(user.role);
    }
    canLinkContext(user) {
        return this.isStaff(user);
    }
    assertCanDispatchToChannel(audienceScope, channel) {
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
    async assertConversationAccess(user, conversationId) {
        if (!(await this.canAccessConversation(user, conversationId))) {
            throw UnifiedMessagingErrors.cannotAccessConversation();
        }
    }
    async assertSupplierIsolation(user, conversationId) {
        if (user.role !== "SUPPLIER")
            return;
        const participant = await this.prisma.workspaceConversationParticipant.findFirst({
            where: {
                conversationId,
                userId: user.id,
                leftAt: null,
                participantKey: participantKeyForUser(user.id),
            },
        });
        if (!participant)
            throw UnifiedMessagingErrors.notParticipant();
    }
    isOwnerOrAdmin(user) {
        return ADMIN_MESSAGING_ROLES.includes(user.role);
    }
    isStaff(user) {
        return (this.isOwnerOrAdmin(user) ||
            user.role === "SALES_CONTROL" ||
            user.role === "OPS_MANAGER");
    }
}
//# sourceMappingURL=unified-messaging.policy.js.map