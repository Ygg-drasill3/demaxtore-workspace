import crypto from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { getEmailProvider } from "../../messaging/provider.js";
import type { EmailBridgeProvider, EmailBridgeMessage, EmailBridgeSendResult } from "./email-bridge-provider.types.js";

/** SMTP provider for Email Notification Bridge. */
export class SmtpEmailBridgeProvider implements EmailBridgeProvider {
  readonly id = "smtp" as const;

  isConfigured(): boolean {
    return Boolean(env.SMTP_HOST);
  }

  async send(msg: EmailBridgeMessage): Promise<EmailBridgeSendResult> {
    if (!env.OUTBOUND_MESSAGING_ENABLED) {
      logger.info({ to: msg.to, subject: msg.subject }, "[Email Bridge] suppressed (OUTBOUND_MESSAGING_ENABLED=false)");
      return { providerMessageId: `suppressed-${crypto.randomUUID().slice(0, 8)}`, demo: true };
    }
    if (!this.isConfigured()) {
      return { providerMessageId: null, demo: false, error: "SMTP_HOST not configured" };
    }

    try {
      const provider = await getEmailProvider();
      if (provider.name !== "smtp") {
        return { providerMessageId: null, demo: false, error: "EMAIL_PROVIDER must be smtp when EMAIL_BRIDGE_PROVIDER=smtp" };
      }
      await provider.send({
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        replyTo: env.EMAIL_REPLY_TO,
      });
      return {
        providerMessageId: `smtp-${crypto.randomUUID()}`,
        demo: false,
        raw: { provider: "smtp" },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "send_failed";
      logger.error({ err, to: msg.to }, "[Email Bridge] smtp send failed");
      return { providerMessageId: null, demo: false, error: message };
    }
  }
}
