const store = new Map();
export class StubPaymentProvider {
    name = "stub";
    async createIntent(input) {
        const id = `pi_stub_${input.orderId.slice(0, 8)}_${Date.now()}`;
        store.set(id, "pending");
        return { id, status: "pending", checkoutUrl: `/payments/checkout/${id}` };
    }
    async getStatus(intentId) {
        return store.get(intentId) ?? "failed";
    }
    async handleWebhook(body) {
        const id = String(body.intentId ?? "");
        const status = String(body.status ?? "pending");
        if (id)
            store.set(id, status);
    }
}
//# sourceMappingURL=stub.provider.js.map