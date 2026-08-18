export async function logWhatsAppConnectionAudit(db, input) {
    await db.whatsAppConnectionAuditLog.create({
        data: {
            buyerId: input.buyerId,
            connectionId: input.connectionId ?? null,
            actorUserId: input.actorUserId ?? null,
            actorRole: input.actorRole ?? null,
            action: input.action,
            detail: (input.detail ?? {}),
        },
    });
}
/** Mask phone number for admin display: +905xx***xx67 */
export function maskPhoneForAdmin(phone) {
    if (!phone)
        return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6)
        return "***";
    return `+${digits.slice(0, 5)}***${digits.slice(-2)}`;
}
/** Mask Meta IDs for admin display. */
export function maskMetaId(id) {
    if (!id)
        return null;
    if (id.length <= 8)
        return "***";
    return `${id.slice(0, 4)}…${id.slice(-4)}`;
}
//# sourceMappingURL=whatsapp-business-audit.service.js.map