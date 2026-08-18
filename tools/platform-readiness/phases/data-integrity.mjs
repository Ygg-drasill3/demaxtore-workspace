import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export async function runDataIntegrity() {
  const issues = [];

  const orphanExceptions = await db.$queryRaw`
    SELECT COUNT(*)::int AS c FROM trade_exceptions te
    LEFT JOIN control_tower_alerts cta ON cta.id = te.alert_id
    WHERE te.alert_id IS NOT NULL AND cta.id IS NULL AND te.status NOT IN ('Resolved','Closed')
  `;
  if (orphanExceptions[0]?.c > 0) {
    issues.push({ type: "orphan_exception_alert", count: orphanExceptions[0].c });
  }

  const duplicateDocVersions = await db.$queryRaw`
    SELECT COUNT(*)::int AS c FROM (
      SELECT trade_document_id, version, COUNT(*) AS n
      FROM trade_document_versions
      GROUP BY trade_document_id, version
      HAVING COUNT(*) > 1
    ) d
  `;
  if (duplicateDocVersions[0]?.c > 0) {
    issues.push({ type: "duplicate_document_versions", count: duplicateDocVersions[0].c });
  }

  const orphanTimeline = await db.$queryRaw`
    SELECT COUNT(*)::int AS c FROM timeline_events te
    LEFT JOIN workspaces w ON w.id = te.workspace_id
    WHERE w.id IS NULL
  `;
  if (orphanTimeline[0]?.c > 0) {
    issues.push({ type: "orphan_timeline_events", count: orphanTimeline[0].c });
  }

  const brokenExceptionTrade = await db.$queryRaw`
    SELECT COUNT(*)::int AS c FROM trade_exceptions te
    LEFT JOIN workspaces w ON w.id = te.trade_root_id
    WHERE w.id IS NULL
  `;
  if (brokenExceptionTrade[0]?.c > 0) {
    issues.push({ type: "broken_exception_trade_root", count: brokenExceptionTrade[0].c });
  }

  const staleRunningJobs = await db.$queryRaw`
    SELECT COUNT(*)::int AS c FROM job_executions
    WHERE status = 'RUNNING' AND started_at < NOW() - INTERVAL '2 hours'
  `;

  const openAlertsNoWorkspace = await db.$queryRaw`
    SELECT COUNT(*)::int AS c FROM control_tower_alerts
    WHERE resolved_at IS NULL AND workspace_id IS NULL
  `;

  const counts = {
    workspaces: await db.workspace.count(),
    rfqs: await db.workspace.count({ where: { type: "RFQ" } }),
    orders: await db.workspace.count({ where: { type: "ORDER" } }),
    shipments: await db.workspace.count({ where: { type: "SHIPMENT" } }),
    tradeDocuments: await db.tradeDocument.count(),
    tradeExceptions: await db.tradeException.count(),
    openExceptions: await db.tradeException.count({
      where: { status: { notIn: ["Resolved", "Closed"] } },
    }),
    timelineEvents: await db.timelineEvent.count(),
    controlTowerAlerts: await db.controlTowerAlert.count({ where: { resolvedAt: null } }),
  };

  const critical = issues.filter((i) =>
    ["orphan_timeline_events", "broken_exception_trade_root", "duplicate_document_versions"].includes(i.type),
  );

  return {
    phase: "phase7_data_integrity",
    verdict: critical.length === 0 ? (issues.length ? "PASS WITH RISK" : "PASS") : "FAIL",
    issues,
    counts,
    staleRunningJobs: staleRunningJobs[0]?.c ?? 0,
    openAlertsNoWorkspace: openAlertsNoWorkspace[0]?.c ?? 0,
  };
}

export async function disconnectDb() {
  await db.$disconnect();
}
