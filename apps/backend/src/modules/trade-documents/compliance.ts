import type { Prisma, PrismaClient } from "@prisma/client";
import type { ComplianceStatus, TradeDocumentType, TradeWorkspaceType } from "@dmx/contracts/trade-documents";
import { computeComplianceFromRows } from "./compliance-engine.js";

type Db = PrismaClient | Prisma.TransactionClient;

export async function getComplianceStatus(
  db: Db,
  workspaceType: TradeWorkspaceType,
  workspaceId: string,
): Promise<ReturnType<typeof computeComplianceFromRows>> {
  const requirements = await db.documentRequirement.findMany({
    where: { workspaceType, workspaceId },
  });
  const documents = await db.tradeDocument.findMany({
    where: { workspaceType, workspaceId },
  });
  return computeComplianceFromRows(requirements, documents);
}

export async function assertShipmentCompletionAllowed(
  db: Db,
  shipmentId: string,
  actor: { role: string },
  payload: Record<string, unknown>,
): Promise<void> {
  const compliance = await getComplianceStatus(db, "SHIPMENT", shipmentId);
  if (compliance.requiredCount === 0) return;
  if (compliance.status === "READY_FOR_SHIPMENT") return;
  if (actor.role === "ADMIN" && payload.complianceOverride === true) return;
  const { AppError } = await import("../../utils/httpErrors.js");
  throw new AppError(409, "COMPLIANCE_NOT_READY", {
    status: compliance.status,
    missingTypes: compliance.missingTypes,
  });
}

export function complianceAuditStatus(status: ComplianceStatus): string | null {
  if (status === "READY_FOR_SHIPMENT") return "compliance.ready";
  return null;
}
