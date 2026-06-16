import type { PaymentIntentStatus } from "@dmx/contracts/payments";

export interface PaymentIntentResult {
  id: string;
  status: PaymentIntentStatus;
  checkoutUrl?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: {
    orderId: string;
    amount: number;
    currency: string;
    description: string;
  }): Promise<PaymentIntentResult>;
  getStatus(intentId: string): Promise<PaymentIntentStatus>;
  handleWebhook(body: Record<string, unknown>): Promise<void>;
}
