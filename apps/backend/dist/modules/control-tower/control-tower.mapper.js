export function toAlertDto(row) {
    return {
        id: row.id,
        severity: row.severity,
        category: row.category,
        alertKey: row.alertKey,
        workspaceId: row.workspaceId,
        workspaceType: row.workspaceType,
        workspaceRef: row.workspace?.externalRef ?? null,
        title: row.title,
        description: row.description,
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        resolvedById: row.resolvedById,
        createdAt: row.createdAt.toISOString(),
    };
}
//# sourceMappingURL=control-tower.mapper.js.map