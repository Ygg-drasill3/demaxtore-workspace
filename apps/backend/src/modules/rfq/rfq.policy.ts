// =============================================================================
// DeMaxtore — RFQ access policy (resource-level authz)
// Destination: apps/backend/src/modules/rfq/rfq.policy.ts
//
// Route-level guards (requireRole) only check the role. This module enforces
// per-workspace participation: a BUYER may only see RFQs they own; a SUPPLIER
// may only see RFQs they've been assigned to; ADMIN + SALES_CONTROL see all.
// =============================================================================
import type { PrismaClient } from "@prisma/client";

import type { AuthUser } from "../../types/auth-user.js";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
export type { AuthUser };

export async function canAccessRfq(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<boolean> {
  if (hasPortfolioVisibility(user.role)) return true;
  const participation = await prisma.workspaceParticipant.findFirst({
    where: { workspaceId, userId: user.id },
    select: { id: true, participantRole: true },
  });
  if (!participation) return false;

  // SUPPLIER only sees RFQs once they're published (state ∈ list)
  if (user.role === "SUPPLIER") {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { state: true } });
    if (!ws) return false;
    return SUPPLIER_VISIBLE_STATES.has(ws.state);
  }
  return true;
}

const SUPPLIER_VISIBLE_STATES = new Set([
  // Visible after admin assign_suppliers, before publish_rfq (demo + ops flow)
  "SUPPLIERS_ASSIGNED",
  "RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION",
  "SUPPLIER_SELECTED",
  "PROFORMA_REQUESTED", "PROFORMA_RECEIVED", "PROFORMA_APPROVED",
  "PO_ISSUED", "CLOSED",
  // Terminal states still visible so suppliers see history of their participation:
  "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD",
]);

/** Convenience: assert + throw (use in service-layer when access required). */
export async function assertCanAccessRfq(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  const ok = await canAccessRfq(prisma, user, workspaceId);
  if (!ok) {
    const err = new Error("FORBIDDEN");
    (err as any).status = 403;
    throw err;
  }
}
