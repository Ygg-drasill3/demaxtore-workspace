import type { OperationalNotificationType } from "@dmx/contracts/notification-center";

export interface WhatsAppTemplateContext {
  centerType: OperationalNotificationType;
  workspaceRef: string;
  headline: string;
  detailLine?: string | null;
  counterpartyLabel?: string | null;
}

const TYPE_HEADLINES: Partial<Record<OperationalNotificationType, string>> = {
  NEW_SUPPLIER_MESSAGE: "New Supplier Message",
  BUYER_MENTIONED: "Buyer Mentioned",
  SUPPLIER_MENTIONED: "Supplier Mentioned",
  APPROVAL_REQUIRED: "Approval Required",
  ACTION_REQUIRED: "Action Required",
  QUOTATION_SUBMITTED: "Quotation Submitted",
  QUOTATION_REVISED: "Quotation Revised",
  PURCHASE_ORDER_ISSUED: "Purchase Order Issued",
  DOCUMENT_UPLOADED: "Document Uploaded",
  INSPECTION_SCHEDULED: "Inspection Scheduled",
  INSPECTION_COMPLETED: "Inspection Completed",
  SHIPMENT_BOOKED: "Shipment Booked",
  ETA_UPDATED: "ETA Updated",
  SHIPMENT_DELAYED: "Shipment Delayed",
  SHIPMENT_DELIVERED: "Shipment Delivered",
};

export function buildWhatsAppTemplateBody(ctx: WhatsAppTemplateContext): {
  templateKey: string;
  bodyText: string;
  buttonLabel: string;
} {
  const headline = TYPE_HEADLINES[ctx.centerType] ?? ctx.headline;
  const lines: string[] = [`*${headline}*`, ""];

  if (ctx.counterpartyLabel) {
    lines.push(`Counterparty: ${ctx.counterpartyLabel}`);
  }
  lines.push(`Workspace: ${ctx.workspaceRef}`);

  if (ctx.detailLine) {
    lines.push("", `"${sanitizeDetail(ctx.detailLine)}"`);
  }

  lines.push(
    "",
    "Tap below to open the conversation securely inside DeMaxtore Workspace.",
    "Do not reply on WhatsApp — reply inside Workspace.",
  );

  return {
    templateKey: ctx.centerType.toLowerCase(),
    bodyText: lines.join("\n").slice(0, 1024),
    buttonLabel: "Open Conversation",
  };
}

function sanitizeDetail(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trim().slice(0, 240);
}

export function maskPhoneForLog(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `***${digits.slice(-4)}`;
}
