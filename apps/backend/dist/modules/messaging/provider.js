// apps/backend/src/modules/messaging/provider.ts
//
// Pluggable email provider. ONE interface, three impls, env-driven selection.
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { redactPasswordlessTokens } from "../../lib/log-redaction.js";
// ── Console provider — dev / staging default ─────────────────────────────────
const consoleProvider = {
    name: "console",
    async send(msg) {
        logger.info({ to: msg.to, subject: msg.subject, length: msg.html.length }, "📧 [console] email rendered (no provider configured)");
        logger.info("\n----- BEGIN EMAIL -----\n"
            + redactPasswordlessTokens(msg.text)
            + "\n-----  END EMAIL  -----");
    },
};
// ── Resend provider ──────────────────────────────────────────────────────────
async function makeResendProvider() {
    if (!env.RESEND_API_KEY)
        throw new Error("RESEND_API_KEY not set");
    const { Resend } = await import("resend");
    const client = new Resend(env.RESEND_API_KEY);
    return {
        name: "resend",
        async send(msg) {
            const { error } = await client.emails.send({
                from: env.EMAIL_FROM,
                to: [msg.to],
                subject: msg.subject,
                html: msg.html,
                text: msg.text,
                replyTo: msg.replyTo ?? env.EMAIL_REPLY_TO,
            });
            if (error)
                throw new Error(`Resend error: ${error.message}`);
        },
    };
}
// ── SMTP provider (nodemailer) ───────────────────────────────────────────────
async function makeSmtpProvider() {
    if (!env.SMTP_HOST)
        throw new Error("SMTP_HOST not set");
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    return {
        name: "smtp",
        async send(msg) {
            await transport.sendMail({
                from: env.EMAIL_FROM,
                to: msg.to,
                subject: msg.subject,
                html: msg.html,
                text: msg.text,
                replyTo: msg.replyTo ?? env.EMAIL_REPLY_TO,
            });
        },
    };
}
// ── Factory ──────────────────────────────────────────────────────────────────
let cached = null;
export async function getEmailProvider() {
    if (cached)
        return cached;
    cached = (async () => {
        try {
            switch (env.EMAIL_PROVIDER) {
                case "resend": return await makeResendProvider();
                case "smtp": return await makeSmtpProvider();
                default: return consoleProvider;
            }
        }
        catch (e) {
            logger.warn({ err: e }, "Email provider init failed — falling back to console");
            return consoleProvider;
        }
    })();
    return cached;
}
//# sourceMappingURL=provider.js.map