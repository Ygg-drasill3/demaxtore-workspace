import type { WhatsAppProviderId } from "@dmx/contracts/whatsapp-notification-bridge";

export interface WhatsAppTemplateMessage {
  toPhone: string;
  bodyText: string;
  buttonLabel: string;
  buttonUrl: string;
}

export interface WhatsAppSendResult {
  providerMessageId: string | null;
  demo: boolean;
  error?: string;
  raw?: Record<string, unknown>;
}

export interface WhatsAppProvider {
  readonly id: WhatsAppProviderId;
  isConfigured(): boolean;
  sendTemplateMessage(msg: WhatsAppTemplateMessage): Promise<WhatsAppSendResult>;
}
