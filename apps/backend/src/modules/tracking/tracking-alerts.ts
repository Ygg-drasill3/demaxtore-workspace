import type { PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { toAlertDto } from "../control-tower/control-tower.mapper.js";
import { isTestWorkspace } from "../control-tower/test-workspace.js";

const TRACKING_ALERT_KEYS = [
  AlertKey.TRACKING_ETA_SHIFT_24H,
  AlertKey.TRACKING_ETA_SHIFT_72H,
  AlertKey.TRACKING_DELAY_DETECTED,
] as const;

export async function upsertControlTowerAlert(
  db: PrismaClient,
  input: {
    workspaceId: string;
    alertKey: string;
    severity: string;
    category?: string;
    workspaceType?: string;
    title: string;
    description: string;
  },
  opts?: { allowTestWorkspace?: boolean },
): Promise<boolean> {
  if (!opts?.allowTestWorkspace && await isTestWorkspace(db, input.workspaceId)) return false;
  const existing = await db.controlTowerAlert.findFirst({
    where: { workspaceId: input.workspaceId, alertKey: input.alertKey, resolvedAt: null },
  });
  if (existing) return false;
  try {
    const row = await db.controlTowerAlert.create({
      data: {
        severity: input.severity,
        category: input.category ?? "SHIPMENT",
        alertKey: input.alertKey,
        workspaceId: input.workspaceId,
        workspaceType: input.workspaceType ?? "SHIPMENT",
        title: input.title,
        description: input.description,
      },
      include: { workspace: { select: { externalRef: true } } },
    });
    socketBus.emitToRole("ADMIN", SocketEvents.CONTROL_TOWER_ALERT_CREATED, { alert: toAlertDto(row) });
    return true;
  } catch {
    return false;
  }
}

export async function resolveTrackingAlerts(db: PrismaClient, workspaceId: string): Promise<number> {
  const open = await db.controlTowerAlert.findMany({
    where: {
      workspaceId,
      alertKey: { in: [...TRACKING_ALERT_KEYS] },
      resolvedAt: null,
    },
  });
  let n = 0;
  for (const a of open) {
    const updated = await db.controlTowerAlert.update({
      where: { id: a.id },
      data: { resolvedAt: new Date(), resolvedById: null },
    });
    socketBus.emitToRole("ADMIN", SocketEvents.CONTROL_TOWER_ALERT_RESOLVED, {
      alertId: updated.id,
      resolvedAt: updated.resolvedAt!.toISOString(),
    });
    n++;
  }
  return n;
}

export async function applyTrackingAlertDiff(
  db: PrismaClient,
  workspaceId: string,
  externalRef: string,
  diff: { etaShiftHours: number | null; delayDetected: boolean; arrived: boolean },
): Promise<number> {
  let created = 0;
  if (diff.etaShiftHours != null && diff.etaShiftHours >= 72) {
    if (await upsertControlTowerAlert(db, {
      workspaceId,
      alertKey: AlertKey.TRACKING_ETA_SHIFT_72H,
      severity: "CRITICAL",
      title: "ETA drift > 72 hours",
      description: `${externalRef} maritime ETA shifted by ${Math.round(diff.etaShiftHours)}h.`,
    })) created++;
  } else if (diff.etaShiftHours != null && diff.etaShiftHours >= 24) {
    if (await upsertControlTowerAlert(db, {
      workspaceId,
      alertKey: AlertKey.TRACKING_ETA_SHIFT_24H,
      severity: "WARNING",
      title: "ETA drift > 24 hours",
      description: `${externalRef} maritime ETA shifted by ${Math.round(diff.etaShiftHours)}h.`,
    })) created++;
  }
  if (diff.delayDetected) {
    if (await upsertControlTowerAlert(db, {
      workspaceId,
      alertKey: AlertKey.TRACKING_DELAY_DETECTED,
      severity: "WARNING",
      title: "Maritime delay detected",
      description: `${externalRef} provider reported a vessel delay.`,
    })) created++;
  }
  if (diff.arrived) {
    await resolveTrackingAlerts(db, workspaceId);
  }
  return created;
}
