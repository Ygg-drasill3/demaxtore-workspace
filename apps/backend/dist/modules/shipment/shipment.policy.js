export async function canAccessShipment(prisma, user, workspaceId) {
    if (user.role === "ADMIN")
        return true;
    const p = await prisma.workspaceParticipant.findFirst({
        where: { workspaceId, userId: user.id, leftAt: null },
    });
    return !!p;
}
//# sourceMappingURL=shipment.policy.js.map