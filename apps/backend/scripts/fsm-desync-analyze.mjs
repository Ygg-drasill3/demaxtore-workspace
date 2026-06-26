#!/usr/bin/env node
/**
 * Deep analysis for Order/Shipment desync pairs (read-only).
 * Usage:
 *   npx tsx apps/backend/scripts/fsm-desync-analyze.mjs
 *   npx tsx apps/backend/scripts/fsm-desync-analyze.mjs --order-id <uuid>
 *   npx tsx apps/backend/scripts/fsm-desync-analyze.mjs --json-out /tmp/desync-analysis.json
 */
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  evaluateOrderShipmentDesync,
  planFromDesyncHit,
  TERMINAL_ORDER_STATES,
  TERMINAL_SHIPMENT_STATES,
} from "@dmx/contracts/order-shipment-orchestration";

const prisma = new PrismaClient();

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const orderIdFilter = argValue("--order-id");
const jsonOut = argValue("--json-out");

const orders = await prisma.workspace.findMany({
  where: {
    type: "ORDER",
    state: { notIn: [...TERMINAL_ORDER_STATES] },
    ...(orderIdFilter ? { id: orderIdFilter } : {}),
  },
  select: {
    id: true,
    externalRef: true,
    state: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
  },
});

const analyses = [];

for (const order of orders) {
  const shipment = await prisma.workspace.findFirst({
    where: { spawnedFromId: order.id, type: "SHIPMENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      externalRef: true,
      state: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!shipment || TERMINAL_SHIPMENT_STATES.includes(shipment.state)) continue;

  const hit = evaluateOrderShipmentDesync(order.state, shipment.state);
  if (!hit) continue;

  const [orderTimeline, shipmentTimeline, alerts, recommendations, processedEvents] =
    await Promise.all([
      prisma.timelineEvent.findMany({
        where: { workspaceId: order.id },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          eventType: true,
          actorUserId: true,
          createdAt: true,
          payload: true,
        },
      }),
      prisma.timelineEvent.findMany({
        where: { workspaceId: shipment.id },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          eventType: true,
          actorUserId: true,
          createdAt: true,
          payload: true,
        },
      }),
      prisma.controlTowerAlert.findMany({
        where: {
          alertKey: "order_shipment_state_mismatch",
          metadata: { path: ["orderId"], equals: order.id },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          severity: true,
          resolvedAt: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.orchestratorRecommendation.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          mode: true,
          rule: true,
          source: true,
          plan: true,
          createdAt: true,
        },
      }),
      prisma.processedEvent.findMany({
        where: {
          OR: [
            { workspaceId: order.id },
            { workspaceId: shipment.id },
            { source: `orchestrator:plan:${order.id}` },
          ],
        },
        orderBy: { processedAt: "desc" },
        take: 10,
        select: {
          id: true,
          source: true,
          eventId: true,
          workspaceId: true,
          action: true,
          processedAt: true,
        },
      }),
    ]);

  const suggestedPlan = planFromDesyncHit({
    orderId: order.id,
    shipmentId: shipment.id,
    orderState: order.state,
    shipmentState: shipment.state,
    hit,
  });

  const orderFsmVersion =
    order.metadata && typeof order.metadata === "object"
      ? order.metadata.fsmVersion ?? null
      : null;

  analyses.push({
    orderId: order.id,
    orderRef: order.externalRef,
    orderState: order.state,
    orderFsmVersion,
    orderUpdatedAt: order.updatedAt.toISOString(),
    shipmentId: shipment.id,
    shipmentRef: shipment.externalRef,
    shipmentState: shipment.state,
    shipmentUpdatedAt: shipment.updatedAt.toISOString(),
    desync: hit,
    suggestedRemediation: suggestedPlan.suggestedActions,
    likelyCause: inferLikelyCause(order, shipment, orderTimeline, shipmentTimeline),
    controlTowerAlerts: alerts,
    orchestratorRecommendations: recommendations,
    processedEvents,
    recentOrderTimeline: orderTimeline,
    recentShipmentTimeline: shipmentTimeline,
  });
}

function inferLikelyCause(order, shipment, orderTimeline, shipmentTimeline) {
  const extractAction = (e) => {
    const p = e.payload && typeof e.payload === "object" ? e.payload : {};
    return p.action ?? p.transitionAction ?? e.eventType;
  };
  const orderActions = orderTimeline.map((e) => ({
    action: extractAction(e),
    at: e.createdAt,
  }));
  const shipmentActions = shipmentTimeline.map((e) => ({
    action: extractAction(e),
    at: e.createdAt,
  }));

  const orderAdvanced = ["mark_departed", "mark_arrived", "mark_delivered", "book_shipment"].some(
    (a) => orderActions.some((e) => e.action === a),
  );
  const shipmentStuck =
    shipment.state === "SHIPMENT_CREATED" || shipment.state === "BOOKING_PENDING";
  const shipmentNeverMoved = shipmentActions.length === 0;

  if (orderAdvanced && shipmentStuck && shipmentNeverMoved) {
    return "legacy_manual_order_transition_without_shipment_mirror";
  }
  if (order.updatedAt > shipment.updatedAt) {
    return "order_transitioned_after_last_shipment_activity";
  }
  return "requires_manual_review";
}

const report = {
  generatedAt: new Date().toISOString(),
  ordersScanned: orders.length,
  desyncCount: analyses.length,
  analyses,
};

const output = JSON.stringify(report, null, 2);
if (jsonOut) {
  writeFileSync(jsonOut, output);
  console.error(`Wrote ${jsonOut}`);
}
console.log(output);
await prisma.$disconnect();
