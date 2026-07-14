import crypto from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { getEmailProvider } from "../../messaging/provider.js";
import type { EmailBridgeProvider, EmailBridgeMessage, EmailBridgeSendResult } from "./email-bridge-provider.types.js";

/** Resend provider for Email Notification Bridge. */
export class ResendEmailBridgeProvider implements EmailBridgeProvider {
  readonly id = "resend" as const;

  isConfigured(): boolean {
    return Boolean(env.RESEND_API_KEY);
  }

  async send(msg: EmailBridgeMessage): Promise<EmailBridgeSendResult> {
    if (!env.OUTBOUND_MESSAGING_ENABLED) {
      logger.info({ to: msg.to, subject: msg.subject }, "[Email Bridge] suppressed (OUTBOUND_MESSAGING_ENABLED=false)");
      return { providerMessageId: `suppressed-${crypto.randomUUID().slice(0, 8)}`, demo: true };
    }
    if (!this.isConfigured()) {
      return { providerMessageId: null, demo: false, error: "RESEND_API_KEY not configured" };
    }

    try {
      const provider = await getEmailProvider();
      if (provider.name !== "resend") {
        return { providerMessageId: null, demo: false, error: "EMAIL_PROVIDER must be resend when EMAIL_BRIDGE_PROVIDER=resend" };
      }
      await provider.send({
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        replyTo: env.EMAIL_REPLY_TO,
      });
      return {
        providerMessageId: `resend-${crypto.randomUUID()}`,
        demo: false,
        raw: { provider: "resend" },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "send_failed";
      logger.error({ err, to: msg.to }, "[Email Bridge] resend send failed");
      return { providerMessageId: null, demo: false, error: message };
    }
  }
}
