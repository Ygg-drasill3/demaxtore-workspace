// Monthly reference freight rates — ops-maintained decision-support data
export const ReferenceFreightRateStatus = ["ACTIVE", "INACTIVE"];
export const ReferenceFreightLifecycleStatus = [
    "ACTIVE",
    "EXPIRING_SOON",
    "EXPIRED",
    "INACTIVE",
];
export const ReferenceFreightAuditAction = [
    "CREATED",
    "UPDATED",
    "DEACTIVATED",
    "IMPORTED",
    "COPIED_MONTH",
];
/** Roles allowed to manage reference freight rates. */
export const REFERENCE_FREIGHT_ADMIN_ROLES = [
    "ADMIN",
    "SUPER_ADMIN",
    "OPS_MANAGER",
    "LOGISTICS_OPERATOR",
];
export const REFERENCE_FREIGHT_MISSING_MESSAGE_TR = "Bu rota için referans navlun verisi bulunmamaktadır. Lütfen FreightIQ ile canlı navlun teklifi alın.";
export const REFERENCE_FREIGHT_DISCLAIMER_TR = "Bu navlun tutarı DeMaxtore'un aylık referans navlun verilerine göre hesaplanmıştır. Nihai navlun fiyatı FreightIQ sürecinde kesinleşecektir.";
export const EXPIRING_SOON_DAYS = 7;
export function computeReferenceFreightLifecycleStatus(status, validFrom, validUntil, now = new Date()) {
    if (status === "INACTIVE")
        return "INACTIVE";
    const from = new Date(validFrom).getTime();
    const until = new Date(validUntil).getTime();
    const ts = now.getTime();
    if (ts > until)
        return "EXPIRED";
    if (ts < from)
        return "ACTIVE";
    const daysLeft = (until - ts) / 86_400_000;
    if (daysLeft <= EXPIRING_SOON_DAYS)
        return "EXPIRING_SOON";
    return "ACTIVE";
}
