import crypto from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { redactPasswordlessTokens } from "../../../lib/log-redaction.js";
import type { EmailBridgeProvider, EmailBridgeMessage, EmailBridgeSendResult } from "./email-bridge-provider.types.js";

/** Explicit demo provider — never delivers real email. */
export class ConsoleEmailBridgeProvider implements EmailBridgeProvider {
  readonly id = "console" as const;

  isConfigured(): boolean {
    return true;
  }

  async send(msg: EmailBridgeMessage): Promise<EmailBridgeSendResult> {
    logger.info(
      { to: msg.to, subject: msg.subject, length: msg.html.length },
      "[Email Bridge] console/demo — email rendered (no provider configured)",
    );
    logger.info(
      "\n----- BEGIN EMAIL -----\n"
        + redactPasswordlessTokens(msg.text)
        + "\n-----  END EMAIL  -----",
    );
    return {
      providerMessageId: `demo-${crypto.randomUUID().slice(0, 12)}`,
      demo: true,
      raw: { provider: "console" },
    };
  }
}
