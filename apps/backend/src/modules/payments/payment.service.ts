import type { PaymentIntentStatus, CreatePaymentIntentPayload } from "@dmx/contracts/payments";
import type { PaymentMilestoneKind } from "@dmx/contracts/payment-milestones";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../../utils/httpErrors.js";
import { StubPaymentProvider } from "./providers/stub.provider.js";
import type { PaymentProvider } from "./providers/types.js";
import { PaymentMilestoneService } from "./payment-milestone.service.js";

export class PaymentService {
  private readonly provider: PaymentProvider;

  constructor(private readonly db: PrismaClient, provider?: PaymentProvider) {
    this.provider = provider ?? new StubPaymentProvider();
  }

  async createIntent(orderId: string, payload: CreatePaymentIntentPayload, actorUserId?: string) {
    const order = await this.db.workspace.findUnique({
      where: { id: orderId },
      include: { orderWorkspace: true },
    });
    if (!order || order.type !== "ORDER") throw new AppError(404, "ORDER_NOT_FOUND");

    const intent = await this.provider.createIntent({
      orderId,
      amount: payload.amount,
      currency: payload.currency,
      description: payload.description ?? `Order ${order.externalRef}`,
    });

    await this.db.timelineEvent.create({
      data: {
        workspaceId: orderId,
        eventType: "payment.pending",
        actorUserId: actorUserId ?? null,
        payload: { intentId: intent.id, status: intent.status, amount: payload.amount, orderId },
      },
    });

    return intent;
  }

  async getStatus(intentId: string): Promise<PaymentIntentStatus> {
    return this.provider.getStatus(intentId);
  }

  async handleWebhook(body: Record<string, unknown>): Promise<void> {
    await this.provider.handleWebhook(body);
    const orderId = body.orderId ? String(body.orderId) : undefined;
    const status = String(body.status ?? "");
    const eventType = String(body.eventType ?? body.type ?? "");
    if (!orderId) return;

    const milestones = new PaymentMilestoneService(this.db);
    if (status === "succeeded" || eventType === "payment.succeeded") {
      const kind = (body.milestoneKind ?? "DEPOSIT_PAID") as PaymentMilestoneKind;
      await milestones.satisfyMilestone(orderId, kind, String(body.eventId ?? body.intentId ?? ""));
    }
    if (eventType === "payment.disputed") {
      await milestones.recordDispute(orderId, String(body.eventId ?? body.intentId ?? "") || undefined);
    }
  }
}
