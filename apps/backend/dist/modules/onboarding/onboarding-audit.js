export async function onboardingAudit(db, userId, action, payload = {}) {
    const anchor = await db.workspace.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, state: true },
    });
    if (!anchor)
        return;
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
    if (!user)
        return;
    await db.auditLog.create({
        data: {
            workspaceId: anchor.id,
            actorUserId: userId,
            actorEmail: user.email,
            actorRole: user.role,
            action,
            fromState: anchor.state,
            toState: anchor.state,
            payload: payload,
        },
    }).catch(() => undefined);
}
//# sourceMappingURL=onboarding-audit.js.map