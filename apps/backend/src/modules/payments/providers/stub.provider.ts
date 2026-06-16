import type { PaymentIntentStatus } from "@dmx/contracts/payments";
import type { PaymentProvider, PaymentIntentResult } from "./types.js";

const store = new Map<string, PaymentIntentStatus>();

export class StubPaymentProvider implements PaymentProvider {
  readonly name = "stub";

  async createIntent(input: {
    orderId: string;
    amount: number;
    currency: string;
    description: string;
  }): Promise<PaymentIntentResult> {
    const id = `pi_stub_${input.orderId.slice(0, 8)}_${Date.now()}`;
    store.set(id, "pending");
    return { id, status: "pending", checkoutUrl: `/payments/checkout/${id}` };
  }

  async getStatus(intentId: string): Promise<PaymentIntentStatus> {
    return store.get(intentId) ?? "failed";
  }

  async handleWebhook(body: Record<string, unknown>): Promise<void> {
    const id = String(body.intentId ?? "");
    const status = String(body.status ?? "pending") as PaymentIntentStatus;
    if (id) store.set(id, status);
  }
}
