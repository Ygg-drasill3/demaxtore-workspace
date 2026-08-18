export async function canAccessOrder(prisma, user, workspaceId) {
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
        return true;
    const p = await prisma.workspaceParticipant.findFirst({
        where: { workspaceId, userId: user.id, leftAt: null },
    });
    return !!p;
}
//# sourceMappingURL=order.policy.js.map