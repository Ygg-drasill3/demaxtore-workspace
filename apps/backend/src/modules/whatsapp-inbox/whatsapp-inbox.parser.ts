import type {
  ParsedInboundMessage,
  ParsedStatusUpdate,
  WhatsAppDeliveryStatus,
  WhatsAppMessageType,
} from "./whatsapp-inbox.types.js";

const SUPPORTED_TYPES = new Set<WhatsAppMessageType>([
  "text",
  "image",
  "document",
  "audio",
  "video",
  "location",
  "contacts",
  "interactive",
  "button",
  "reaction",
  "unsupported",
  "sticker",
]);

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>> : [];
}

function parseMessageType(raw: string | undefined): WhatsAppMessageType {
  if (!raw) return "unsupported";
  return SUPPORTED_TYPES.has(raw as WhatsAppMessageType) ? (raw as WhatsAppMessageType) : "unsupported";
}

function extractBody(msg: Record<string, unknown>, type: WhatsAppMessageType): string | null {
  switch (type) {
    case "text":
      return String(asRecord(msg.text)?.body ?? "") || null;
    case "button":
      return String(asRecord(msg.button)?.text ?? "") || null;
    case "interactive": {
      const interactive = asRecord(msg.interactive);
      const buttonReply = asRecord(interactive?.button_reply);
      const listReply = asRecord(interactive?.list_reply);
      return String(buttonReply?.title ?? listReply?.title ?? "") || null;
    }
    case "reaction":
      return String(asRecord(msg.reaction)?.emoji ?? "") || null;
    case "location": {
      const loc = asRecord(msg.location);
      if (!loc) return null;
      const lat = loc.latitude;
      const lng = loc.longitude;
      const name = loc.name ? String(loc.name) : "";
      return name ? `📍 ${name} (${lat}, ${lng})` : `📍 ${lat}, ${lng}`;
    }
    case "contacts":
      return "👤 Contact shared";
    case "image":
    case "video":
    case "document":
    case "audio":
    case "sticker":
      return null;
    default:
      return type === "unsupported" ? "[Unsupported message]" : null;
  }
}

function extractMedia(msg: Record<string, unknown>, type: WhatsAppMessageType) {
  const mediaKey = type === "sticker" ? "sticker" : type;
  const media = asRecord(msg[mediaKey]) ?? asRecord(msg.image) ?? asRecord(msg.document)
    ?? asRecord(msg.audio) ?? asRecord(msg.video);
  if (!media) return { mediaId: null, mimeType: null, filename: null, caption: null };
  return {
    mediaId: media.id ? String(media.id) : null,
    mimeType: media.mime_type ? String(media.mime_type) : null,
    filename: media.filename ? String(media.filename) : null,
    caption: media.caption ? String(media.caption) : null,
  };
}

export function parseInboundMessages(body: Record<string, unknown>): ParsedInboundMessage[] {
  const out: ParsedInboundMessage[] = [];
  if (body.object !== "whatsapp_business_account") return out;

  for (const entry of asArray(body.entry)) {
    for (const change of asArray(entry.changes)) {
      if (change.field !== "messages") continue;
      const value = asRecord(change.value) ?? {};
      const metadata = asRecord(value.metadata);
      const phoneNumberId = metadata?.phone_number_id ? String(metadata.phone_number_id) : null;

      const contactsByWaId = new Map<string, string>();
      for (const c of asArray(value.contacts)) {
        const waId = c.wa_id ? String(c.wa_id) : null;
        const name = asRecord(c.profile)?.name;
        if (waId && name) contactsByWaId.set(waId, String(name));
      }

      for (const msg of asArray(value.messages)) {
        const waId = msg.from ? String(msg.from) : null;
        const metaMessageId = msg.id ? String(msg.id) : null;
        if (!waId || !metaMessageId) continue;

        const type = parseMessageType(msg.type ? String(msg.type) : undefined);
        const { mediaId, mimeType, filename, caption } = extractMedia(msg, type);
        const context = asRecord(msg.context);
        const ts = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();

        out.push({
          waId,
          profileName: contactsByWaId.get(waId) ?? null,
          metaMessageId,
          timestamp: ts,
          type,
          body: extractBody(msg, type),
          replyToMetaId: context?.id ? String(context.id) : null,
          mediaId,
          mimeType,
          filename,
          caption,
          phoneNumberId,
          raw: msg,
        });
      }
    }
  }
  return out;
}

export function parseStatusUpdates(body: Record<string, unknown>): ParsedStatusUpdate[] {
  const out: ParsedStatusUpdate[] = [];
  if (body.object !== "whatsapp_business_account") return out;

  const validStatuses = new Set<WhatsAppDeliveryStatus>(["sent", "delivered", "read", "failed"]);

  for (const entry of asArray(body.entry)) {
    for (const change of asArray(entry.changes)) {
      if (change.field !== "messages") continue;
      const value = asRecord(change.value) ?? {};

      for (const st of asArray(value.statuses)) {
        const metaMessageId = st.id ? String(st.id) : null;
        const status = st.status ? String(st.status) : null;
        if (!metaMessageId || !status || !validStatuses.has(status as WhatsAppDeliveryStatus)) continue;

        const errors = asArray(st.errors);
        const firstErr = errors[0] ?? null;
        const ts = st.timestamp ? new Date(Number(st.timestamp) * 1000) : new Date();

        out.push({
          metaMessageId,
          status: status as WhatsAppDeliveryStatus,
          timestamp: ts,
          recipientId: st.recipient_id ? String(st.recipient_id) : null,
          errorCode: firstErr?.code != null ? String(firstErr.code) : null,
          errorTitle: firstErr?.title ? String(firstErr.title) : null,
          errorMessage: firstErr?.message ? String(firstErr.message)
            : firstErr?.error_data && asRecord(firstErr.error_data)?.details
              ? String(asRecord(firstErr.error_data)!.details)
              : null,
          raw: st,
        });
      }
    }
  }
  return out;
}
