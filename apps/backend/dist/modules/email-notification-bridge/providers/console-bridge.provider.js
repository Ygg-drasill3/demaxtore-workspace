import crypto from "node:crypto";
import { logger } from "../../../config/logger.js";
import { redactPasswordlessTokens } from "../../../lib/log-redaction.js";
/** Explicit demo provider — never delivers real email. */
export class ConsoleEmailBridgeProvider {
    id = "console";
    isConfigured() {
        return true;
    }
    async send(msg) {
        logger.info({ to: msg.to, subject: msg.subject, length: msg.html.length }, "[Email Bridge] console/demo — email rendered (no provider configured)");
        logger.info("\n----- BEGIN EMAIL -----\n"
            + redactPasswordlessTokens(msg.text)
            + "\n-----  END EMAIL  -----");
        return {
            providerMessageId: `demo-${crypto.randomUUID().slice(0, 12)}`,
            demo: true,
            raw: { provider: "console" },
        };
    }
}
//# sourceMappingURL=console-bridge.provider.js.map