export const WHATSAPP_INBOX_ADMIN_ROLES = new Set([
    "SUPER_ADMIN",
    "ADMIN",
    "OPS_MANAGER",
]);
export const WHATSAPP_INBOX_STAFF_ROLES = new Set([
    ...WHATSAPP_INBOX_ADMIN_ROLES,
    "SALES_CONTROL",
]);
export function canAccessWhatsAppInbox(role) {
    return WHATSAPP_INBOX_STAFF_ROLES.has(role);
}
export function canAccessAllWhatsAppConversations(role) {
    return WHATSAPP_INBOX_ADMIN_ROLES.has(role);
}
export const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
//# sourceMappingURL=whatsapp-inbox.types.js.map