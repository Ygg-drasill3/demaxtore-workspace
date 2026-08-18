// apps/backend/src/modules/messaging/templates.ts
//
// Three vanilla-HTML templates (inline CSS, table layout, no MJML/Handlebars).
// Each function returns { subject, html, text }.
import { env } from "../../config/env.js";
const BRAND = "DeMaxtore";
const BRAND_COLOR = "#0F172A"; // ink-900
const ACCENT_COLOR = "#1E3A8A"; // accent-900
const MUTED = "#64748B";
function shell(title, bodyHtml, ctaHtml = "") {
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:${BRAND_COLOR};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F8FAFC;padding:32px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"
      style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:24px 28px;border-bottom:1px solid #F1F5F9;">
        <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:${MUTED};">${BRAND}</div>
        <h1 style="margin:6px 0 0;font-size:22px;font-weight:600;line-height:1.3;color:${BRAND_COLOR};">${escape(title)}</h1>
      </td></tr>
      <tr><td style="padding:24px 28px;font-size:14px;line-height:1.6;color:${BRAND_COLOR};">${bodyHtml}</td></tr>
      ${ctaHtml ? `<tr><td style="padding:0 28px 24px;">${ctaHtml}</td></tr>` : ""}
      <tr><td style="padding:18px 28px;border-top:1px solid #F1F5F9;font-size:11px;color:${MUTED};">
        You receive this email because of activity in your DeMaxtore workspace.<br/>
        Reply to <a href="mailto:${env.EMAIL_REPLY_TO}" style="color:${ACCENT_COLOR};">${env.EMAIL_REPLY_TO}</a> with questions.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
const btn = (href, label) => `<a href="${href}" style="display:inline-block;background:${ACCENT_COLOR};color:#FFF;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;">${escape(label)}</a>`;
function escape(s) {
    return String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
// ── Supplier account welcome (Sales Control) ─────────────────────────────────
export function supplierAccountWelcomeTemplate(p) {
    const subject = `DeMaxtore tedarikçi hesabınız hazır`;
    const invitedBy = p.createdByName
        ? `<p>Hesabınız DeMaxtore ekibinden <strong>${escape(p.createdByName)}</strong> tarafından oluşturuldu.</p>`
        : `<p>Hesabınız DeMaxtore Sales Control üzerinden oluşturuldu.</p>`;
    const credentialRow = (label, value, mono = false) => `<tr><td style="padding:10px 16px;border-top:1px solid #E2E8F0;width:38%;color:${MUTED};vertical-align:top;"><strong>${escape(label)}</strong></td>` +
        `<td style="padding:10px 16px;border-top:1px solid #E2E8F0;${mono ? "font-family:ui-monospace,monospace;font-size:13px;" : ""}">${escape(value)}</td></tr>`;
    const html = shell("Tedarikçi hesabınız hazır", `<p>Merhaba ${escape(p.displayName)},</p>
     ${invitedBy}
     <p>Aşağıdaki bilgilerle DeMaxtore tedarikçi paneline giriş yapabilirsiniz.
     RFQ davetlerini görüntüleyebilir, teklif verebilir ve sipariş süreçlerinizi tek yerden yönetebilirsiniz.</p>
     <table role="presentation" cellspacing="0" cellpadding="0" border="0"
       style="margin:16px 0;font-size:14px;line-height:1.5;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;width:100%;">
       <tr><td style="padding:10px 16px;width:38%;color:${MUTED};"><strong>Ad Soyad</strong></td>
           <td style="padding:10px 16px;">${escape(p.displayName)}</td></tr>
       ${credentialRow("Şirket", p.organisationName)}
       ${credentialRow("Kullanıcı adı (e-posta)", p.email, true)}
       ${credentialRow("Şifre", p.password, true)}
       ${credentialRow("Hesap türü", "Tedarikçi (Supplier)")}
       ${credentialRow("Giriş adresi", p.loginUrl, true)}
     </table>
     <p><strong>Buradan giriş yapın:</strong> <a href="${escape(p.loginUrl)}" style="color:${ACCENT_COLOR};">${escape(p.loginUrl)}</a></p>
     <p style="font-size:12px;color:${MUTED};">Bu bilgileri güvenli tutun. İlk girişten sonra şifrenizi değiştirebilirsiniz.</p>`, btn(p.loginUrl, "DeMaxtore'a giriş yap"));
    const text = `Merhaba ${p.displayName},

DeMaxtore tedarikçi hesabınız hazır. Aşağıdaki bilgilerle giriş yapabilirsiniz:

Ad Soyad: ${p.displayName}
Şirket: ${p.organisationName}
Kullanıcı adı (e-posta): ${p.email}
Şifre: ${p.password}
Hesap türü: Tedarikçi (Supplier)
Giriş adresi: ${p.loginUrl}

Buradan giriş yapın: ${p.loginUrl}

RFQ davetleri ve sipariş güncellemeleri bu panel üzerinden iletilecektir.`;
    return { subject, html, text };
}
/** Plain-text welcome for WhatsApp (primary + secondary contacts). */
export function supplierAccountWelcomeWhatsApp(p) {
    return `Merhaba ${p.displayName},

DeMaxtore hesabınız hazır.

Şirket: ${p.organisationName}
E-posta: ${p.email}
Şifre: ${p.password}
Giriş: ${p.loginUrl}

RFQ davetleri ve sipariş güncellemeleri bu panel üzerinden iletilecektir.`;
}
// ── Forgot password ──────────────────────────────────────────────────────────
export function forgotPasswordTemplate(p) {
    const subject = `Reset your ${BRAND} password`;
    const html = shell(subject, `<p>Hello ${escape(p.displayName)},</p>
     <p>We received a request to reset your password. Click the button below to choose a new one. The link expires in 1 hour.</p>
     <p style="font-size:12px;color:${MUTED};">If you didn't request this, you can ignore this email — your password won't change.</p>`, btn(p.resetUrl, "Reset password"));
    const text = `Hello ${p.displayName},

Reset your ${BRAND} password using this link (expires in 1 hour):
${p.resetUrl}

If you didn't request this, ignore this email.`;
    return { subject, html, text };
}
// ── Proforma SLA reminder ────────────────────────────────────────────────────
export function proformaSlaReminderTemplate(p) {
    const subject = `Proforma due soon — ${p.rfqRef}`;
    const html = shell(subject, `<p>Hello ${escape(p.displayName)},</p>
     <p>The buyer is waiting for your proforma on <strong>${escape(p.rfqRef)}</strong>.</p>
     <p>Deadline: <strong>${escape(new Date(p.deadlineAt).toLocaleString())}</strong> (less than 24 hours away).</p>
     <p>Please upload it before the deadline to keep this order moving.</p>`, btn(p.workspaceUrl, "Open workspace"));
    const text = `Hello ${p.displayName},

The buyer is waiting for your proforma on ${p.rfqRef}.
Deadline: ${new Date(p.deadlineAt).toLocaleString()} (< 24h away).

Open the workspace: ${p.workspaceUrl}`;
    return { subject, html, text };
}
// ── Critical notification fallback ───────────────────────────────────────────
export function notificationFallbackTemplate(p) {
    const subject = `${p.title}`;
    const html = shell(subject, `<p>Hello ${escape(p.displayName)},</p>
     ${p.body ? `<p>${escape(p.body)}</p>` : ""}
     <p style="font-size:12px;color:${MUTED};">Event: <code>${escape(p.eventType)}</code></p>`, p.workspaceUrl ? btn(p.workspaceUrl, "Open workspace") : "");
    const text = `${p.title}\n\n${p.body ?? ""}\n\n${p.workspaceUrl ?? ""}\n\n— ${BRAND}`;
    return { subject, html, text };
}
//# sourceMappingURL=templates.js.map