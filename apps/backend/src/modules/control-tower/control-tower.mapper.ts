import type { ControlTowerAlert as PrismaAlert, Workspace } from "@prisma/client";
import type { ControlTowerAlert } from "@dmx/contracts/control-tower";

type Row = PrismaAlert & { workspace?: Pick<Workspace, "externalRef"> | null };

export function toAlertDto(row: Row): ControlTowerAlert {
  return {
    id: row.id,
    severity: row.severity as ControlTowerAlert["severity"],
    category: row.category as ControlTowerAlert["category"],
    alertKey: row.alertKey,
    workspaceId: row.workspaceId,
    workspaceType: row.workspaceType as ControlTowerAlert["workspaceType"],
    workspaceRef: row.workspace?.externalRef ?? null,
    title: row.title,
    description: row.description,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedById: row.resolvedById,
    createdAt: row.createdAt.toISOString(),
  };
}
