import { env } from "./env.js";
import { resolveIncotermProfile, type IncotermProfile } from "@dmx/contracts/incoterms";
import { AppError } from "../utils/httpErrors.js";
import type { PrismaClient } from "@prisma/client";

export function isIncotermsPreconditionsEnabled(): boolean {
  return env.INCOTERMS_PRECONDITIONS_ENABLED === true;
}

const INCOTERM_GATED_ORDER_ACTIONS = new Set(["book_shipment", "mark_delivered", "start_production"]);

export async function getOrderIncotermProfile(
  db: Pick<PrismaClient, "orderWorkspace">,
  orderId: string,
): Promise<IncotermProfile> {
  const ow = await db.orderWorkspace.findUnique({
    where: { workspaceId: orderId },
    select: { incoterms: true },
  });
  return resolveIncotermProfile(ow?.incoterms);
}

export function assertIncotermDocuments(
  profile: IncotermProfile,
  approvedDocTypes: string[],
): string[] {
  if (!isIncotermsPreconditionsEnabled()) return [];
  return profile.requiredDocuments.filter((d) => !approvedDocTypes.includes(d));
}

/** Block order transitions when required incoterm documents are not approved. */
export async function assertOrderIncotermPreconditions(
  db: PrismaClient,
  orderId: string,
  action: string,
): Promise<void> {
  if (!isIncotermsPreconditionsEnabled()) return;
  if (!INCOTERM_GATED_ORDER_ACTIONS.has(action)) return;

  const profile = await getOrderIncotermProfile(db, orderId);
  const approved = await db.tradeDocument.findMany({
    where: { workspaceType: "ORDER", workspaceId: orderId, status: "APPROVED" },
    select: { documentType: true },
  });
  const missing = assertIncotermDocuments(
    profile,
    approved.map((d) => d.documentType),
  );
  if (missing.length > 0) {
    throw new AppError(409, "INCOTERM_DOCUMENTS_REQUIRED", {
      missing,
      incoterm: profile.code,
    });
  }
}
