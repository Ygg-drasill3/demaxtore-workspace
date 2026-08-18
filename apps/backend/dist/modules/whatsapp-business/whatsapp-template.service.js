import { env } from "../../config/env.js";
/** Resolve cold-outreach template for a buyer connection. Never falls back to global in buyer_connection mode. */
export async function resolveBuyerWhatsAppTemplate(db, connectionId, purpose = "RFQ_COLD_OUTREACH") {
    const mapped = await db.whatsAppConnectionTemplate.findFirst({
        where: { connectionId, purpose, isDefault: true },
        orderBy: { updatedAt: "desc" },
    });
    if (mapped) {
        return { templateName: mapped.templateName, templateLanguage: mapped.templateLanguage };
    }
    const anyTemplate = await db.whatsAppConnectionTemplate.findFirst({
        where: { connectionId, purpose },
        orderBy: { updatedAt: "desc" },
    });
    if (anyTemplate) {
        return { templateName: anyTemplate.templateName, templateLanguage: anyTemplate.templateLanguage };
    }
    // shared mode may use platform default
    const globalName = env.WHATSAPP_RFQ_TEMPLATE_NAME?.trim();
    if (globalName) {
        return { templateName: globalName, templateLanguage: env.WHATSAPP_RFQ_TEMPLATE_LANGUAGE ?? "en" };
    }
    return null;
}
export async function upsertDefaultBuyerTemplate(db, connectionId, templateName, templateLanguage = "en") {
    await db.whatsAppConnectionTemplate.updateMany({
        where: { connectionId, purpose: "RFQ_COLD_OUTREACH", isDefault: true },
        data: { isDefault: false },
    });
    await db.whatsAppConnectionTemplate.upsert({
        where: {
            connectionId_templateName_templateLanguage: {
                connectionId,
                templateName,
                templateLanguage,
            },
        },
        create: {
            connectionId,
            templateName,
            templateLanguage,
            purpose: "RFQ_COLD_OUTREACH",
            isDefault: true,
        },
        update: { isDefault: true },
    });
}
//# sourceMappingURL=whatsapp-template.service.js.map