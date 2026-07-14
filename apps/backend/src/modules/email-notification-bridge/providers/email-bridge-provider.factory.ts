import type { EmailBridgeProvider } from "./email-bridge-provider.types.js";
import { ConsoleEmailBridgeProvider } from "./console-bridge.provider.js";
import { ResendEmailBridgeProvider } from "./resend-bridge.provider.js";
import { SmtpEmailBridgeProvider } from "./smtp-bridge.provider.js";
import { env } from "../../../config/env.js";

let cached: EmailBridgeProvider | null = null;

export class EmailBridgeProviderNotImplementedError extends Error {
  constructor(providerId: string) {
    super(`Email bridge provider "${providerId}" is not implemented`);
    this.name = "EmailBridgeProviderNotImplementedError";
  }
}

export function getEmailBridgeProvider(): EmailBridgeProvider {
  if (cached) return cached;

  const id = env.EMAIL_BRIDGE_PROVIDER;
  switch (id) {
    case "console":
      cached = new ConsoleEmailBridgeProvider();
      return cached;
    case "smtp":
      cached = new SmtpEmailBridgeProvider();
      return cached;
    case "resend":
      cached = new ResendEmailBridgeProvider();
      return cached;
    default:
      throw new EmailBridgeProviderNotImplementedError(String(id));
  }
}

export function resetEmailBridgeProviderForTests(): void {
  cached = null;
}
