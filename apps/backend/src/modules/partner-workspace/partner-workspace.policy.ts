import type { PartnerCapability, PartnerRole } from "@dmx/contracts/partner-workspace";
import { isPartnerRole, partnerHasCapability } from "@dmx/contracts/partner-workspace";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";

export type PartnerActor = {
  id: string;
  role: string;
  email: string;
};

export function resolvePartnerRole(actor: PartnerActor): PartnerRole | null {
  if (isPartnerRole(actor.role)) return actor.role;
  return null;
}

export function assertPartnerCapability(role: PartnerRole, cap: PartnerCapability): void {
  if (!partnerHasCapability(role, cap)) {
    const err = new Error("FORBIDDEN");
    (err as Error & { status: number; code: string }).status = 403;
    (err as Error & { code: string }).code = "PARTNER_CAPABILITY_DENIED";
    throw err;
  }
}

export function canManagePartnerAssignments(role: string): boolean {
  return (
    isPlatformAdminRole(role)
    || role === "OPS_MANAGER"
    || role === "LOGISTICS_OPERATOR"
    || role === "SALES_CONTROL"
    || role === "DOCUMENT_CONTROLLER"
  );
}

/** Fields stripped from partner-facing shipment/order summaries. */
export const PARTNER_REDACTED_KEYS = new Set([
  "margin",
  "marginPct",
  "internalMargin",
  "landedCost",
  "internalNotes",
  "costBreakdown",
  "buyPrice",
  "sellPrice",
  "commission",
  "profit",
]);

export function redactForPartner(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (PARTNER_REDACTED_KEYS.has(k)) continue;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = redactForPartner(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
