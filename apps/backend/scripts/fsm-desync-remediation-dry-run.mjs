#!/usr/bin/env node
/**
 * Desync remediation plan (dry-run) and safe shipment-led apply.
 *
 * Usage:
 *   npx tsx apps/backend/scripts/fsm-desync-remediation-dry-run.mjs
 *   npx tsx apps/backend/scripts/fsm-desync-remediation-dry-run.mjs --order-id <uuid>
 *   npx tsx apps/backend/scripts/fsm-desync-remediation-dry-run.mjs --apply
 */
import { PrismaClient } from "@prisma/client";
import {
  evaluateOrderShipmentDesync,
  planFromDesyncHit,
  buildShipmentCatchUpSteps,
  TERMINAL_ORDER_STATES,
  TERMINAL_SHIPMENT_STATES,
} from "@dmx/contracts/order-shipment-orchestration";
const DESYNC_TARGET_SHIPMENT = {
  ORDER_SHIPMENT_BOOKED_LAG: "BOOKING_CONFIRMED",
  ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT: "IN_TRANSIT",
  ORDER_DELIVERED_SHIPMENT_NOT_DELIVERED: "DELIVERED",
  ORDER_ARRIVED_SHIPMENT_IN_TRANSIT: "ARRIVED_DESTINATION_PORT",
  ORDER_PARTIALLY_DELIVERED_MISMATCH: "PARTIALLY_DELIVERED",
};
import { ShipmentService } from "../src/modules/shipment/shipment.service.js";

const prisma = new PrismaClient();

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function defaultShipmentPayload(action, base = {}) {
  const payload = { ...base };
  if (action === "assign_container") payload.containerNumber ??= `ORCH${Date.now().toString().slice(-7)}`;
  if (action === "load_vessel") {
    payload.vesselName ??= "MV Orchestrator";
    payload.voyageNumber ??= "V001";
  }
  if (action === "confirm_booking") {
    payload.carrierName ??= "Maersk";
    payload.bookingRef ??= `BK-${Date.now()}`;
  }
  return payload;
}

const orderIdFilter = argValue("--order-id");
const applyFlag = process.argv.includes("--apply");

const adminActor = applyFlag
  ? await prisma.user.findFirst({
      where: { email: "admin@demaxtore.local" },
      select: { id: true, email: true, role: true },
    })
  : null;
if (applyFlag && !adminActor) {
  console.error("ERROR: admin@demaxtore.local not found — cannot apply remediation");
  process.exit(1);
}

const orders = await prisma.workspace.findMany({
  where: {
    type: "ORDER",
    state: { notIn: [...TERMINAL_ORDER_STATES] },
    ...(orderIdFilter ? { id: orderIdFilter } : {}),
  },
  select: { id: true, externalRef: true, state: true },
});

const plans = [];
const applyResults = [];

for (const order of orders) {
  const shipment = await prisma.workspace.findFirst({
    where: { spawnedFromId: order.id, type: "SHIPMENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, externalRef: true, state: true },
  });
  if (!shipment || TERMINAL_SHIPMENT_STATES.includes(shipment.state)) continue;

  const hit = evaluateOrderShipmentDesync(order.state, shipment.state);
  if (!hit) continue;

  const plan = planFromDesyncHit({
    orderId: order.id,
    shipmentId: shipment.id,
    orderState: order.state,
    shipmentState: shipment.state,
    hit,
  });

  const shipmentSteps = plan.suggestedActions.filter((s) => s.entity === "SHIPMENT");

  const manualSteps = plan.suggestedActions.map((step, i) => ({
    step: i + 1,
    entity: step.entity,
    action: step.action,
    via: step.entity === "SHIPMENT" ? "shipment workspace UI or gateway" : "order workspace (ADMIN)",
    note:
      step.entity === "SHIPMENT"
        ? "Preferred: shipment-led catch-up"
        : "Only if shipment already correct and order lags",
  }));

  const entry = {
    orderId: order.id,
    orderRef: order.externalRef,
    orderState: order.state,
    shipmentId: shipment.id,
    shipmentRef: shipment.externalRef,
    shipmentState: shipment.state,
    rule: hit.rule,
    severity: hit.severity,
    laggingEntity: hit.laggingEntity,
    recommendedApproach:
      hit.laggingEntity === "SHIPMENT"
        ? "Advance shipment FSM to target; order will mirror when AUTO_APPLY enabled"
        : "Advance order FSM or apply mirror via Exception Hub",
    dryRunSteps: manualSteps,
    exceptionHubApply:
      "POST /api/orchestration/recommendations/:id/apply (ADMIN) after orchestrator generates plan",
    autoFixable: hit.laggingEntity === "SHIPMENT" && shipmentSteps.length > 0,
    requiresManualReview: hit.severity === "critical",
  };

  if (applyFlag && entry.autoFixable) {
    const shipments = new ShipmentService(prisma);
    const applied = [];
    let currentShipment = await prisma.workspace.findUnique({
      where: { id: shipment.id },
      select: { state: true },
    });
    try {
      const target = DESYNC_TARGET_SHIPMENT[hit.rule];
      for (let guard = 0; guard < 20; guard++) {
        const stateNow = currentShipment?.state ?? shipment.state;
        const remaining = buildShipmentCatchUpSteps(stateNow, target);
        if (!remaining.length) break;
        const step = remaining[0];
        const before = stateNow;
        await shipments.applyTransition({
          workspaceId: shipment.id,
          action: step.action,
          actor: { id: adminActor.id, email: adminActor.email, role: "ADMIN" },
          payload: defaultShipmentPayload(step.action, step.payload),
          idempotencyKey: `remediation:${shipment.id}:${step.action}:${guard}:${Date.now()}`,
        });
        currentShipment = await prisma.workspace.findUnique({
          where: { id: shipment.id },
          select: { state: true },
        });
        applied.push({ action: step.action, from: before, to: currentShipment?.state });
        if (currentShipment?.state === before) break;
      }
      const afterHit = evaluateOrderShipmentDesync(
        order.state,
        currentShipment?.state ?? shipment.state,
      );
      applyResults.push({
        ...entry,
        applied,
        resolved: !afterHit,
        shipmentStateAfter: currentShipment?.state,
      });
    } catch (err) {
      applyResults.push({
        ...entry,
        applied,
        resolved: false,
        error: err instanceof Error ? err.message : String(err),
        shipmentStateAfter: currentShipment?.state,
      });
    }
  }

  plans.push(entry);
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: applyFlag ? "apply" : "dry-run",
  destructive: false,
  featureFlagRequired: false,
  planCount: plans.length,
  plans,
  applyResults: applyFlag ? applyResults : undefined,
};

console.log(JSON.stringify(report, null, 2));
await prisma.$disconnect();
