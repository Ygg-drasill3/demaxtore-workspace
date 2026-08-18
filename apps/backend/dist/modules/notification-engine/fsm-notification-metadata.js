import { resolveOperationalShape } from "./notification-engine.mapper.js";
/** Build Notification Center metadata for legacy FSM notification rows. */
export function buildFsmNotificationMetadata(input) {
    const shape = resolveOperationalShape(input.auditEvent, {}, undefined);
    return {
        centerType: shape.centerType,
        priority: shape.priority,
        category: shape.category,
        commWorkspaceType: input.commWorkspaceType,
        commWorkspaceId: input.commWorkspaceId,
        workspaceRef: input.workspaceRef ?? null,
        sensitiveContent: input.sensitiveContent ?? false,
    };
}
//# sourceMappingURL=fsm-notification-metadata.js.map