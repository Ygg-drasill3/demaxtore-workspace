const GENERIC_SUMMARY = "An action requires your attention in Workspace.";
const SENSITIVE_EVENT_TYPES = new Set([
    "communication.internal_note",
]);
const SENSITIVE_CENTER_TYPES = new Set([
    "ACTION_REQUIRED",
]);
/** Operational email bodies must not leak restricted workspace content. */
export function resolveEmailSafeMessage(input) {
    if (input.metadata.sensitiveContent === true)
        return GENERIC_SUMMARY;
    if (input.metadata.messageVisibility && input.metadata.messageVisibility !== "ALL_PARTICIPANTS") {
        return GENERIC_SUMMARY;
    }
    if (input.eventType && SENSITIVE_EVENT_TYPES.has(input.eventType))
        return GENERIC_SUMMARY;
    if (SENSITIVE_CENTER_TYPES.has(input.shape.centerType)
        && input.eventType === "communication.internal_note") {
        return GENERIC_SUMMARY;
    }
    return input.message;
}
export { GENERIC_SUMMARY };
//# sourceMappingURL=email-bridge.content.js.map