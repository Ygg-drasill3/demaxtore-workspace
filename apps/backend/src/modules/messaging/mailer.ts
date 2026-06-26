// apps/backend/src/modules/messaging/mailer.ts
//
// Single public helper. All email entry points go through this.
// Fire-and-forget by default — never blocks the HTTP response.

import { logger } from "../../config/logger.js";
import { getEmailProvider, type EmailMessage } from "./provider.js";

/**
 * Send a transactional email.
 *
 * - Never throws to the caller. Failures are logged at WARN.
 * - `await` is safe but optional; production callers should call it without
 *   awaiting so the HTTP response isn't blocked by SMTP/HTTP latency.
 */
export async function send(msg: EmailMessage): Promise<{ ok: boolean }> {
  try {
    const provider = await getEmailProvider();
    await provider.send(msg);
    logger.debug({ to: msg.to, subject: msg.subject, provider: provider.name }, "📧 email sent");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, to: msg.to, subject: msg.subject }, "📧 email send failed");
    return { ok: false };
  }
}

/** Convenience: schedule a send without awaiting. */
export function sendAsync(msg: EmailMessage): void {
  void send(msg);
}

export const mailer = { send, sendAsync };
