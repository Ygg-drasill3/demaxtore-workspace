#!/usr/bin/env node
/**
 * Shadow orchestrator parity report (read-only).
 * Run with FSM_ORCHESTRATOR_ENABLED=true, SHADOW_MODE=true, AUTO_APPLY=false.
 *
 * Usage:
 *   npx tsx apps/backend/scripts/shadow-parity-report.mjs
 *   npx tsx apps/backend/scripts/shadow-parity-report.mjs --markdown-out docs/shadow-parity-report-latest.md
 */
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  evaluateOrderShipmentDesync,
  orderMirrorForShipmentAction,
  TERMINAL_ORDER_STATES,
  TERMINAL_SHIPMENT_STATES,
} from "@dmx/contracts/order-shipment-orchestration";

const prisma = new PrismaClient();
const markdownOutIdx = process.argv.indexOf("--markdown-out");
const markdownOut = markdownOutIdx >= 0 ? process.argv[markdownOutIdx + 1] : undefined;
const sampleSize = Number(process.argv.find((a) => a.startsWith("--sample="))?.split("=")[1] ?? 20);

const [orderCount, shipmentCount, recommendations, processedEvents, exceptions, desyncPairs] =
  await Promise.all([
    prisma.workspace.count({
      where: { type: "ORDER", state: { notIn: [...TERMINAL_ORDER_STATES] } },
    }),
    prisma.workspace.count({
      where: {
        type: "SHIPMENT",
        state: { notIn: [...TERMINAL_SHIPMENT_STATES] },
      },
    }),
    prisma.orchestratorRecommendation.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        orderId: true,
        shipmentId: true,
        mode: true,
        rule: true,
        source: true,
        plan: true,
        createdAt: true,
      },
    }),
    prisma.processedEvent.groupBy({
      by: ["source", "eventId"],
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    }).catch(() => []),
    prisma.tradeException.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
    }),
    (async () => {
      const orders = await prisma.workspace.findMany({
        where: { type: "ORDER", state: { notIn: [...TERMINAL_ORDER_STATES] } },
        select: { id: true, state: true },
        take: 500,
      });
      const pairs = [];
      for (const order of orders) {
        const shipment = await prisma.workspace.findFirst({
          where: { spawnedFromId: order.id, type: "SHIPMENT" },
          orderBy: { createdAt: "desc" },
          select: { id: true, state: true },
        });
        if (!shipment || TERMINAL_SHIPMENT_STATES.includes(shipment.state)) continue;
        const hit = evaluateOrderShipmentDesync(order.state, shipment.state);
        if (hit) pairs.push({ orderId: order.id, orderState: order.state, shipmentState: shipment.state, ...hit });
      }
      return pairs;
    })(),
  ]);

const byMode = recommendations.reduce(
  (acc, r) => {
    acc[r.mode] = (acc[r.mode] ?? 0) + 1;
    return acc;
  },
  /** @type {Record<string, number>} */ ({}),
);

/** Compare shipment_transition recommendations to expected mirror mapping. */
const mismatches = [];
let matched = 0;

for (const rec of recommendations.filter((r) => r.source === "shipment_transition" && r.mode === "shadow")) {
  const plan = rec.plan;
  if (!plan || typeof plan !== "object") continue;
  const suggested = plan.suggestedActions ?? [];
  const shipmentStep = suggested.find((s) => s.entity === "SHIPMENT");
  const orderStep = suggested.find((s) => s.entity === "ORDER");
  if (!shipmentStep) continue;

  const expected = orderMirrorForShipmentAction(shipmentStep.action, {
    orderState: plan.shadowDiff?.orderStateBefore,
  });
  const expectedAction = expected?.action ?? null;
  const actualAction = orderStep?.action ?? null;

  if (expectedAction === actualAction || (!expectedAction && !actualAction)) {
    matched++;
  } else {
    mismatches.push({
      recommendationId: rec.id,
      orderId: rec.orderId,
      shipmentAction: shipmentStep.action,
      expectedOrderAction: expectedAction,
      actualOrderAction: actualAction,
    });
  }
}

const duplicateProcessedEvents = await prisma.$queryRaw`
  SELECT source, event_id, COUNT(*)::int AS cnt
  FROM processed_events
  GROUP BY source, event_id
  HAVING COUNT(*) > 1
  LIMIT 50
`;

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    activeOrders: orderCount,
    activeShipments: shipmentCount,
    recommendations: recommendations.length,
    recommendationsByMode: byMode,
    matchedShadowMirrors: matched,
    mirrorMismatches: mismatches.length,
    desyncPairs: desyncPairs.length,
    exceptionsLast7d: exceptions,
    duplicateProcessedEventGroups: Array.isArray(duplicateProcessedEvents)
      ? duplicateProcessedEvents.length
      : 0,
  },
  mismatches: mismatches.slice(0, sampleSize),
  desyncPairs,
  duplicateProcessedEvents: duplicateProcessedEvents,
  rollbackTestChecklist: {
    disableOrchestrator: "FSM_ORCHESTRATOR_ENABLED=false + backend restart",
    verifyManualOrderLogistics: "Order workspace shows logistics CTAs",
    verifyShipmentFlow: "06-shipment-flow E2E 9/9",
  },
};

const md = `# Shadow Parity Report

**Generated:** ${report.generatedAt}

## Totals

| Metric | Value |
|--------|-------|
| Active orders | ${orderCount} |
| Active shipments | ${shipmentCount} |
| Recommendations (sampled) | ${recommendations.length} |
| Shadow mode | ${byMode.shadow ?? 0} |
| Applied | ${byMode.apply ?? 0} |
| Matched shadow mirrors | ${matched} |
| Mirror mismatches | ${mismatches.length} |
| Desync pairs | ${desyncPairs.length} |
| Exceptions (7d) | ${exceptions} |
| Duplicate processed_event groups | ${report.totals.duplicateProcessedEventGroups} |

## Mismatch root causes

${mismatches.length === 0 ? "None in sampled shadow shipment_transition recommendations." : mismatches.map((m) => `- Rec \`${m.recommendationId}\`: shipment \`${m.shipmentAction}\` expected order \`${m.expectedOrderAction}\` got \`${m.actualOrderAction}\``).join("\n")}

## Rollback test

1. Set \`FSM_ORCHESTRATOR_ENABLED=false\`, restart backend
2. Run \`./scripts/staging-baseline.sh\`
3. Confirm order logistics UI visible and shipment E2E green

## Commands

\`\`\`bash
npx tsx apps/backend/scripts/shadow-parity-report.mjs
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose
\`\`\`
`;

if (markdownOut) {
  writeFileSync(markdownOut, md);
  console.error(`Wrote ${markdownOut}`);
}

console.log(JSON.stringify(report, null, 2));
await prisma.$disconnect();
