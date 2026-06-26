#!/usr/bin/env node
/**
 * Read-only report: active orders missing payment plans / unsatisfied deposit milestones.
 * Use before enabling PAYMENT_GATES_ENABLED in production.
 *
 * Usage:
 *   npx tsx apps/backend/scripts/payment-milestone-seed-dry-run.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PAYMENT_GATED_ORDER_ACTIONS } from "@dmx/contracts/payment-milestones";

const prisma = new PrismaClient();

const activeOrders = await prisma.workspace.findMany({
  where: {
    type: "ORDER",
    state: { notIn: ["CLOSED", "CANCELLED", "REJECTED"] },
  },
  select: { id: true, externalRef: true, state: true },
  take: 5000,
});

const gatedActions = Object.keys(PAYMENT_GATED_ORDER_ACTIONS);
const needsSeed = [];
const needsDepositSatisfy = [];

for (const order of activeOrders) {
  const plan = await prisma.paymentPlan.findUnique({
    where: { orderId: order.id },
    include: { milestones: true, holds: true },
  });

  if (!plan) {
    needsSeed.push({
      orderId: order.id,
      orderRef: order.externalRef,
      orderState: order.state,
      issue: "NO_PAYMENT_PLAN",
      recommendation: "Run PaymentMilestoneService.ensurePlan or ops seed before P4",
    });
    continue;
  }

  for (const [action, requiredKind] of Object.entries(PAYMENT_GATED_ORDER_ACTIONS)) {
    const milestone = plan.milestones.find((m) => m.kind === requiredKind);
    if (!milestone || milestone.status !== "SATISFIED") {
      needsDepositSatisfy.push({
        orderId: order.id,
        orderRef: order.externalRef,
        orderState: order.state,
        gatedAction: action,
        requiredMilestone: requiredKind,
        milestoneStatus: milestone?.status ?? "MISSING",
        recommendation:
          milestone?.status === "PENDING"
            ? "Satisfy via payment webhook or manual milestone satisfy before P4"
            : "Create milestone row via ensurePlan",
      });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: "dry-run",
  destructive: false,
  activeOrderCount: activeOrders.length,
  gatedActions,
  ordersNeedingPlanSeed: needsSeed.length,
  ordersWithUnsatisfiedGates: needsDepositSatisfy.length,
  needsSeed: needsSeed.slice(0, 100),
  needsDepositSatisfy: needsDepositSatisfy.slice(0, 100),
};

console.log(JSON.stringify(report, null, 2));
await prisma.$disconnect();
