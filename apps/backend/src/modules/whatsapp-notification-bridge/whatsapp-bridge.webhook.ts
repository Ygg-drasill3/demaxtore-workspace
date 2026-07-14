export type WhatsAppStatusUpdate = {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  raw: Record<string, unknown>;
};

/** Parse Meta Cloud API message status webhooks (delivery receipts). */
export function parseWhatsAppStatusWebhook(body: Record<string, unknown>): WhatsAppStatusUpdate[] {
  const out: WhatsAppStatusUpdate[] = [];
  if (body.object !== "whatsapp_business_account") return out;

  for (const entry of (body.entry as Array<Record<string, unknown>>) ?? []) {
    for (const change of (entry.changes as Array<Record<string, unknown>>) ?? []) {
      if (change.field !== "messages") continue;
      const value = (change.value as Record<string, unknown>) ?? {};
      for (const st of (value.statuses as Array<Record<string, unknown>>) ?? []) {
        const id = st.id as string | undefined;
        const status = st.status as string | undefined;
        if (!id || !status) continue;
        if (!["sent", "delivered", "read", "failed"].includes(status)) continue;
        out.push({
          providerMessageId: id,
          status: status as WhatsAppStatusUpdate["status"],
          raw: st,
        });
      }
    }
  }
  return out;
}
