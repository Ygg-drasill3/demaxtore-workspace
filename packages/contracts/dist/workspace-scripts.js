// Shared workspace script types — Sprint Buyer Premium UX
/** Maps platform actor roles to workspace script roles (SYSTEM has no scripts). */
export function toWorkspaceScriptRole(role) {
    if (role === "BUYER" || role === "SUPPLIER" || role === "ADMIN")
        return role;
    return undefined;
}
export function formatScript(text, vars) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
        const v = vars[k];
        return v == null ? `{{${k}}}` : String(v);
    });
}
