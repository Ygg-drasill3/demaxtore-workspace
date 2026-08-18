import { env } from "../../config/env.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
/** Meta Cloud API phone_number_id — platform fallback for legacy ops inbox. */
export function getWhatsAppBusinessPhoneNumberId() {
    return env.WHATSAPP_PHONE_NUMBER_ID ?? "default";
}
export async function resolveLatestInboundAt(db, phone, phoneNumberId) {
    const normalized = normalizePhone(phone);
    if (!normalized)
        return null;
    const contact = await db.whatsAppContact.findUnique({
        where: { waId: normalized },
        select: { id: true },
    });
    if (!contact)
        return null;
    const where = phoneNumberId
        ? { contactId: contact.id, phoneNumberId }
        : { contactId: contact.id };
    const agg = await db.whatsAppConversation.aggregate({
        where,
        _max: { lastInboundAt: true },
    });
    return agg._max.lastInboundAt;
}
export async function resolveContactAndConversation(db, phone, phoneNumberId) {
    const normalized = normalizePhone(phone);
    if (!normalized)
        throw new Error("INVALID_PHONE");
    const resolvedPhoneNumberId = phoneNumberId ?? getWhatsAppBusinessPhoneNumberId();
    let contact = await db.whatsAppContact.findUnique({ where: { waId: normalized } });
    if (!contact) {
        contact = await db.whatsAppContact.create({
            data: { waId: normalized, phoneNumber: normalized },
        });
    }
    let conversation = await db.whatsAppConversation.findUnique({
        where: { contactId_phoneNumberId: { contactId: contact.id, phoneNumberId: resolvedPhoneNumberId } },
    });
    if (!conversation) {
        const sibling = await db.whatsAppConversation.findFirst({
            where: { contactId: contact.id },
            orderBy: { lastInboundAt: "desc" },
        });
        conversation = await db.whatsAppConversation.create({
            data: {
                contactId: contact.id,
                phoneNumberId: resolvedPhoneNumberId,
                lastInboundAt: sibling?.lastInboundAt ?? null,
                lastMessageAt: sibling?.lastMessageAt ?? null,
                lastMessagePreview: sibling?.lastMessagePreview ?? null,
                workspaceRfqId: sibling?.workspaceRfqId ?? null,
            },
        });
    }
    else if (!conversation.lastInboundAt) {
        const latest = await resolveLatestInboundAt(db, phone, resolvedPhoneNumberId);
        if (latest) {
            conversation = await db.whatsAppConversation.update({
                where: { id: conversation.id },
                data: { lastInboundAt: latest },
            });
        }
    }
    return { contact, conversation, phoneNumberId: resolvedPhoneNumberId };
}
//# sourceMappingURL=whatsapp-conversation.util.js.map