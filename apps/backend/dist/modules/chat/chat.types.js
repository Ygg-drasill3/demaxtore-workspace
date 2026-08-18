export const ADMIN_CHAT_ROLES = new Set([
    "ADMIN",
    "SUPER_ADMIN",
    "OPS_MANAGER",
]);
export function isAdminChatRole(role) {
    return ADMIN_CHAT_ROLES.has(role);
}
//# sourceMappingURL=chat.types.js.map