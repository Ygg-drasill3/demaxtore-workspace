import type { EmailBridgeProviderId } from "@dmx/contracts/email-notification-bridge";

export interface EmailBridgeMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailBridgeSendResult {
  providerMessageId: string | null;
  demo: boolean;
  error?: string;
  raw?: Record<string, unknown>;
}

export interface EmailBridgeProvider {
  readonly id: EmailBridgeProviderId;
  isConfigured(): boolean;
  send(msg: EmailBridgeMessage): Promise<EmailBridgeSendResult>;
}
