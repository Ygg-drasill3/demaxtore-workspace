import { mailer } from "./mailer.js";
import { env } from "../../config/env.js";

export async function sendCriticalEmail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  if (env.EMAIL_PROVIDER === "console" && env.NODE_ENV === "test") return;
  await mailer.send({
    to,
    subject: `[DeMaxtore] ${subject}`,
    text,
    html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
  });
}

export function sendCriticalEmailAsync(
  to: string,
  subject: string,
  text: string,
): void {
  void sendCriticalEmail(to, subject, text);
}
