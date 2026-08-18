import { env } from "../../config/env.js";
const BRAND = "DeMaxtore";
const INK = "#0F172A";
const ACCENT = "#1E3A8A";
const MUTED = "#64748B";
const PAPER = "#F8FAFC";
const PRIORITY_STYLES = {
    CRITICAL: { bg: "#DC2626", fg: "#FFFFFF", label: "Critical" },
    HIGH: { bg: "#D97706", fg: "#FFFFFF", label: "High" },
    NORMAL: { bg: "#0284C7", fg: "#FFFFFF", label: "Normal" },
    INFORMATION: { bg: "#64748B", fg: "#FFFFFF", label: "Information" },
};
const TYPE_HEADLINES = {
    NEW_SUPPLIER_MESSAGE: "New Supplier Message",
    BUYER_MENTIONED: "Buyer Mentioned",
    SUPPLIER_MENTIONED: "Supplier Mentioned",
    APPROVAL_REQUIRED: "Approval Required",
    ACTION_REQUIRED: "Action Required",
    QUOTATION_SUBMITTED: "Quotation Submitted",
    QUOTATION_REVISED: "Quotation Revised",
    SUPPLIER_SELECTED: "Supplier Selected",
    COMMODITYBID_CLOSED: "CommodityBid Closed",
    PURCHASE_ORDER_ISSUED: "Purchase Order Issued",
    DOCUMENT_UPLOADED: "Document Uploaded",
    INSPECTION_SCHEDULED: "Inspection Scheduled",
    INSPECTION_COMPLETED: "Inspection Completed",
    SHIPMENT_BOOKED: "Shipment Booked",
    ETA_UPDATED: "ETA Updated",
    SHIPMENT_DELAYED: "Shipment Delayed",
    SHIPMENT_DELIVERED: "Shipment Delivered",
    WORKSPACE_ASSIGNED: "Workspace Assigned",
};
function escape(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function metaRow(label, value) {
    return `<tr>
    <td style="padding:8px 0;color:${MUTED};font-size:12px;width:36%;vertical-align:top;">${escape(label)}</td>
    <td style="padding:8px 0;font-size:13px;font-weight:500;color:${INK};">${escape(value)}</td>
  </tr>`;
}
export function buildOperationalEmailTemplate(ctx) {
    const headline = TYPE_HEADLINES[ctx.centerType] ?? ctx.title;
    const pri = PRIORITY_STYLES[ctx.priority];
    const subject = `[${BRAND}] ${headline} — ${ctx.workspaceRef}`;
    const templateKey = ctx.centerType.toLowerCase();
    const ts = new Date(ctx.occurredAt).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
    });
    const metaRows = [
        metaRow("Workspace", ctx.workspaceRef),
        metaRow("Type", ctx.workspaceType),
        ctx.buyerLabel ? metaRow("Buyer", ctx.buyerLabel) : "",
        ctx.supplierLabel ? metaRow("Supplier", ctx.supplierLabel) : "",
        metaRow("Time (UTC)", `${ts} UTC`),
    ].join("");
    const pixel = ctx.trackingPixelUrl
        ? `<img src="${escape(ctx.trackingPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
        : "";
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escape(subject)}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #0B1220 !important; }
      .email-card { background-color: #111827 !important; border-color: #1F2937 !important; }
      .email-text { color: #F8FAFC !important; }
      .email-muted { color: #94A3B8 !important; }
      .email-meta { background-color: #0F172A !important; border-color: #1E293B !important; }
    }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-pad { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-bg" style="background:${PAPER};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="email-container email-card"
        style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
        <tr><td class="email-pad" style="padding:24px 28px;border-bottom:1px solid #F1F5F9;">
          <div class="email-muted" style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${MUTED};">${BRAND} Workspace</div>
          <h1 class="email-text" style="margin:10px 0 0;font-size:22px;font-weight:600;line-height:1.35;color:${INK};">${escape(headline)}</h1>
          <span style="display:inline-block;margin-top:12px;padding:4px 10px;border-radius:999px;background:${pri.bg};color:${pri.fg};font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">${pri.label}</span>
        </td></tr>
        <tr><td class="email-pad" style="padding:20px 28px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-meta"
            style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:4px 16px;margin-bottom:20px;">
            ${metaRows}
          </table>
          ${ctx.message ? `<p class="email-text" style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">${escape(ctx.message)}</p>` : ""}
          <p class="email-muted" style="margin:0;font-size:13px;line-height:1.5;color:${MUTED};">
            Open the conversation in Workspace to read the full context and reply securely.
            <strong>Do not reply to this email.</strong>
          </p>
        </td></tr>
        <tr><td class="email-pad" style="padding:0 28px 28px;">
          <a href="${escape(ctx.openConversationUrl)}" style="display:inline-block;background:${ACCENT};color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">Open Conversation</a>
        </td></tr>
        <tr><td class="email-pad email-muted" style="padding:18px 28px;border-top:1px solid #F1F5F9;font-size:11px;line-height:1.5;color:${MUTED};">
          Operational notification from ${BRAND} Import Operating System.<br/>
          Workspace is the system of record — manage all replies inside Conversation Hub.
        </td></tr>
      </table>
    </td></tr>
  </table>
  ${pixel}
</body>
</html>`;
    const text = `${headline} [${pri.label}]

Workspace: ${ctx.workspaceRef}
Type: ${ctx.workspaceType}
${ctx.buyerLabel ? `Buyer: ${ctx.buyerLabel}\n` : ""}${ctx.supplierLabel ? `Supplier: ${ctx.supplierLabel}\n` : ""}Time: ${ts} UTC

${ctx.message ?? ""}

Open conversation (secure, no login required):
${ctx.openConversationUrl}

Do not reply to this email. Reply inside Workspace Conversation Hub.
— ${BRAND}`;
    return { subject, html, text, templateKey };
}
export function buildOpenTrackingUrl(deliveryId) {
    if (env.EMAIL_BRIDGE_OPEN_TRACKING_ENABLED === false)
        return undefined;
    const base = env.API_PUBLIC_BASE_URL.replace(/\/$/, "");
    return `${base}/api/email-bridge/track/${deliveryId}/open.gif`;
}
export function maskEmailForLog(email) {
    const [local, domain] = email.split("@");
    if (!local || !domain)
        return "***";
    const visible = local.length <= 2 ? "*" : `${local[0]}***${local.slice(-1)}`;
    return `${visible}@${domain}`;
}
//# sourceMappingURL=email-bridge.templates.js.map