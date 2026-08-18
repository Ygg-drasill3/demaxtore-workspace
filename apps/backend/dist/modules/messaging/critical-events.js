import { mailer } from "./mailer.js";
import { env } from "../../config/env.js";
export async function sendCriticalEmail(to, subject, text) {
    if (env.EMAIL_PROVIDER === "console" && env.NODE_ENV === "test")
        return;
    await mailer.send({
        to,
        subject: `[DeMaxtore] ${subject}`,
        text,
        html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
    });
}
export function sendCriticalEmailAsync(to, subject, text) {
    void sendCriticalEmail(to, subject, text);
}
//# sourceMappingURL=critical-events.js.map