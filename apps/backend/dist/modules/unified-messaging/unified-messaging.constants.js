/** Application channel field maps to existing `channelSource` column. */
export const CHANNEL_COLUMN = "channelSource";
export const ADMIN_MESSAGING_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "OPS_MANAGER",
    "SALES_CONTROL",
];
export const SALES_MANAGER_ROLES = ["SALES_CONTROL", "ADMIN", "SUPER_ADMIN"];
export const INTERNAL_MESSAGE_TYPES = new Set([
    "INTERNAL_NOTE",
    "SYSTEM_EVENT",
    "STATUS_UPDATE",
]);
export function mapLegacyMessageTypeToAudience(messageType, visibility) {
    if (INTERNAL_MESSAGE_TYPES.has(messageType) || visibility === "ADMIN_ONLY") {
        return "INTERNAL";
    }
    if (messageType === "SYSTEM_EVENT" || messageType === "STATUS_UPDATE") {
        return "SYSTEM";
    }
    return "EXTERNAL";
}
export function channelFromColumn(value) {
    if (value === "WHATSAPP")
        return "WHATSAPP";
    if (value === "SYSTEM")
        return "SYSTEM";
    return "WORKSPACE";
}
export function channelToColumn(channel) {
    return channel;
}
export function defaultDirectionForAudience(audience) {
    if (audience === "INTERNAL")
        return "INTERNAL";
    return "OUTBOUND";
}
export function participantKeyForUser(userId) {
    return `user:${userId}`;
}
export function participantKeyForWhatsApp(contactId) {
    return `wa:${contactId}`;
}
//# sourceMappingURL=unified-messaging.constants.js.map