import type { ReferenceFreightLifecycleStatus } from "@dmx/contracts/reference-freight";

export function lifecycleBadgeClass(status: ReferenceFreightLifecycleStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "EXPIRING_SOON":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "EXPIRED":
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
    case "INACTIVE":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-zinc-50 text-zinc-600 border-zinc-200";
  }
}

export function lifecycleLabel(status: ReferenceFreightLifecycleStatus): string {
  return status.replace(/_/g, " ");
}

export function monthBoundsIso(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const validFrom = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const validUntil = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { validFrom: validFrom.toISOString(), validUntil: validUntil.toISOString() };
}

export function currentYearMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const CSV_TEMPLATE = `originPort,destinationPort,containerType,referenceFreight,currency,validFrom,validUntil
Mersin,Lagos,20GP,2450,USD,2026-08-01T00:00:00.000Z,2026-08-31T23:59:59.999Z
Izmir,Tema,40HC,3300,USD,2026-08-01T00:00:00.000Z,2026-08-31T23:59:59.999Z`;
