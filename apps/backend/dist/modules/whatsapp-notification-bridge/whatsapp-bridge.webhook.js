/** Parse Meta Cloud API message status webhooks (delivery receipts). */
export function parseWhatsAppStatusWebhook(body) {
    const out = [];
    if (body.object !== "whatsapp_business_account")
        return out;
    for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
            if (change.field !== "messages")
                continue;
            const value = change.value ?? {};
            for (const st of value.statuses ?? []) {
                const id = st.id;
                const status = st.status;
                if (!id || !status)
                    continue;
                if (!["sent", "delivered", "read", "failed"].includes(status))
                    continue;
                out.push({
                    providerMessageId: id,
                    status: status,
                    raw: st,
                });
            }
        }
    }
    return out;
}
//# sourceMappingURL=whatsapp-bridge.webhook.js.map