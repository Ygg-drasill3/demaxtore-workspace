export async function bootstrapWorkspaceConversation(db, workspaceType, workspaceId) {
    const existing = await db.workspaceConversation.findUnique({
        where: {
            workspaceType_workspaceId: { workspaceType, workspaceId },
        },
    });
    if (existing)
        return { id: existing.id, created: false };
    const conv = await db.workspaceConversation.create({
        data: {
            workspaceType,
            workspaceId,
            status: "ACTIVE",
        },
    });
    return { id: conv.id, created: true };
}
export async function bootstrapWithSystemEvent(db, resolved, systemEventKey, body, actorUserId, metadata) {
    const { SystemEventsService } = await import("./system-events.service.js");
    const events = new SystemEventsService(db);
    await events.record(resolved.workspaceType, resolved.workspaceId, {
        systemEventKey,
        systemEventType: systemEventKey,
        body,
        actorUserId,
        metadata,
    });
}
//# sourceMappingURL=conversation-bootstrap.js.map