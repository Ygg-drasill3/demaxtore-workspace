export async function canAccessBulkContainer(prisma, user, workspaceId) {
    if (user.role === "ADMIN")
        return true;
    if (user.role !== "BUYER")
        return false;
    const p = await prisma.workspaceParticipant.findFirst({
        where: { workspaceId, userId: user.id, participantRole: "OWNER" },
        select: { id: true },
    });
    return !!p;
}
export async function assertCanAccessBulkContainer(prisma, user, workspaceId) {
    const ok = await canAccessBulkContainer(prisma, user, workspaceId);
    if (!ok) {
        const err = new Error("FORBIDDEN");
        err.status = 403;
        throw err;
    }
}
//# sourceMappingURL=bulk-container.policy.js.map