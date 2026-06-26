import type { PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";

const STALL_DAYS = 7;

/** Sprint 9A — onboarding stalled-user alerts (additive). */
export async function scanOnboardingAlerts(db: PrismaClient): Promise<number> {
  let n = 0;
  const cutoff = new Date(Date.now() - STALL_DAYS * 86_400_000);

  const stalled = await db.userOnboardingProgress.findMany({
    where: {
      completed: false,
      firstTradeCompleted: false,
      updatedAt: { lte: cutoff },
    },
    include: { user: { select: { email: true, displayName: true } } },
    take: 50,
  });

  for (const row of stalled) {
    const anchor = await db.workspace.findFirst({
      where: { type: "RFQ" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!anchor) continue;

    const alertKey =
      row.role === "BUYER"    ? AlertKey.BUYER_FIRST_TRADE_STUCK :
      row.role === "SUPPLIER" ? AlertKey.SUPPLIER_FIRST_TRADE_STUCK :
      AlertKey.OPERATOR_FIRST_TRADE_STUCK;

    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor.id,
        alertKey,
        severity: "WARNING",
        category: "ACCOUNT",
        workspaceType: "RFQ",
        title: `First trade stuck: ${row.role.toLowerCase()}`,
        description: `${row.user.displayName} (${row.user.email}) stalled on step "${row.currentStep ?? "start"}" for ${STALL_DAYS}+ days.`,
      })
    ) {
      n++;
      socketBus.emitToRole("ADMIN", SocketEvents.ONBOARDING_ALERT_GENERATED, {
        userId: row.userId,
        role: row.role,
        alertKey,
      });
    }

    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor.id,
        alertKey: AlertKey.ONBOARDING_STALLED,
        severity: "INFO",
        category: "ACCOUNT",
        workspaceType: "RFQ",
        title: "Onboarding stalled",
        description: `${row.user.email} has not progressed onboarding in ${STALL_DAYS}+ days.`,
      })
    ) n++;

    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor.id,
        alertKey: AlertKey.TRADE_PROGRESS_INACTIVE,
        severity: "INFO",
        category: "ACCOUNT",
        workspaceType: "RFQ",
        title: "Trade progress inactive",
        description: `No onboarding progress for ${row.user.email} since ${row.updatedAt.toISOString().slice(0, 10)}.`,
      })
    ) n++;
  }

  return n;
}
