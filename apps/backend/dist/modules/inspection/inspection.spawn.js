export async function spawnInspectionFromOrder(tx, input) {
    const existing = await tx.inspectionWorkspace.findFirst({
        where: {
            orderWorkspaceId: input.orderWorkspaceId,
            status: { notIn: ["CANCELLED"] },
        },
        orderBy: { createdAt: "desc" },
    });
    if (existing) {
        return { inspectionId: existing.id, inspectionNumber: existing.inspectionNumber };
    }
    const count = await tx.inspectionWorkspace.count({
        where: { orderWorkspaceId: input.orderWorkspaceId },
    });
    const inspectionNumber = `INS-${input.orderExternalRef}-${String(count + 1).padStart(2, "0")}`;
    const row = await tx.inspectionWorkspace.create({
        data: {
            orderWorkspaceId: input.orderWorkspaceId,
            inspectionNumber,
            inspectionType: "FINAL_RANDOM",
            status: "REQUESTED",
            inspectorName: input.inspectorName ?? null,
            factoryName: input.factoryName ?? null,
            supplierName: input.supplierName ?? null,
            purchaseOrderId: input.purchaseOrderId ?? null,
            shipmentWorkspaceId: input.shipmentWorkspaceId ?? null,
            requestedByUserId: input.actorUserId,
            requestedAt: new Date(),
            assignedAt: input.inspectorName ? new Date() : null,
        },
    });
    await tx.timelineEvent.create({
        data: {
            workspaceId: input.orderWorkspaceId,
            eventType: "inspection.requested",
            actorUserId: input.actorUserId,
            payload: {
                inspectionId: row.id,
                inspectionNumber: row.inspectionNumber,
            },
        },
    });
    return { inspectionId: row.id, inspectionNumber: row.inspectionNumber };
}
//# sourceMappingURL=inspection.spawn.js.map