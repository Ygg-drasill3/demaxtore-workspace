export async function marketAudit(db, action, payload) {
    const anchor = await db.workspace.findFirst({
        where: { type: "ORDER" },
        orderBy: { createdAt: "asc" },
        select: { id: true, state: true },
    });
    if (!anchor)
        return;
    await db.auditLog.create({
        data: {
            workspaceId: anchor.id,
            actorUserId: "00000000-0000-0000-0000-000000000001",
            actorEmail: "system@demaxtore.local",
            actorRole: "SYSTEM",
            action,
            fromState: anchor.state,
            toState: anchor.state,
            payload: payload,
        },
    }).catch(() => undefined);
}
//# sourceMappingURL=market-audit.js.map