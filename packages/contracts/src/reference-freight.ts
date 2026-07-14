// Monthly reference freight rates — ops-maintained decision-support data

export const ReferenceFreightRateStatus = ["ACTIVE", "INACTIVE"] as const;
export type ReferenceFreightRateStatus = (typeof ReferenceFreightRateStatus)[number];

export const ReferenceFreightLifecycleStatus = [
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
  "INACTIVE",
] as const;
export type ReferenceFreightLifecycleStatus = (typeof ReferenceFreightLifecycleStatus)[number];

export const ReferenceFreightAuditAction = [
  "CREATED",
  "UPDATED",
  "DEACTIVATED",
  "IMPORTED",
  "COPIED_MONTH",
] as const;
export type ReferenceFreightAuditAction = (typeof ReferenceFreightAuditAction)[number];

/** Roles allowed to manage reference freight rates. */
export const REFERENCE_FREIGHT_ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
] as const;

export interface ReferenceFreightRateDto {
  id: string;
  originPort: string;
  destinationPort: string;
  containerType: string;
  referenceFreight: number;
  currency: string;
  validFrom: string;
  validUntil: string;
  status: ReferenceFreightRateStatus;
  lifecycleStatus: ReferenceFreightLifecycleStatus;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceFreightRateListPage {
  items: ReferenceFreightRateDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReferenceFreightRateAuditDto {
  id: string;
  rateId: string | null;
  action: ReferenceFreightAuditAction;
  actorUserId: string | null;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface ReferenceFreightImportResultDto {
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export interface ReferenceFreightCopyMonthResultDto {
  copied: number;
  skipped: number;
  targetMonth: string;
}

export interface ReferenceFreightLookupDto {
  status: "FOUND" | "MISSING";
  originPort: string;
  destinationPort: string;
  containerType: string;
  rate: ReferenceFreightRateDto | null;
  message: string | null;
}

export const REFERENCE_FREIGHT_MISSING_MESSAGE_TR =
  "Bu rota için referans navlun verisi bulunmamaktadır. Lütfen FreightIQ ile canlı navlun teklifi alın.";

export const REFERENCE_FREIGHT_DISCLAIMER_TR =
  "Bu navlun tutarı DeMaxtore'un aylık referans navlun verilerine göre hesaplanmıştır. Nihai navlun fiyatı FreightIQ sürecinde kesinleşecektir.";

export const EXPIRING_SOON_DAYS = 7;

export function computeReferenceFreightLifecycleStatus(
  status: ReferenceFreightRateStatus,
  validFrom: string | Date,
  validUntil: string | Date,
  now: Date = new Date(),
): ReferenceFreightLifecycleStatus {
  if (status === "INACTIVE") return "INACTIVE";
  const from = new Date(validFrom).getTime();
  const until = new Date(validUntil).getTime();
  const ts = now.getTime();
  if (ts > until) return "EXPIRED";
  if (ts < from) return "ACTIVE";
  const daysLeft = (until - ts) / 86_400_000;
  if (daysLeft <= EXPIRING_SOON_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
}
