#!/usr/bin/env node
/**
 * Faz 1/2 — read-only Order/Shipment FSM desync audit.
 * Usage:
 *   npx tsx apps/backend/scripts/fsm-migration-audit.mjs
 *   npx tsx apps/backend/scripts/fsm-migration-audit.mjs --apply-metadata
 *   npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose
 *   npx tsx apps/backend/scripts/fsm-migration-audit.mjs --json-out /tmp/fsm-audit.json
 */
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  evaluateOrderShipmentDesync,
  TERMINAL_ORDER_STATES,
  TERMINAL_SHIPMENT_STATES,
} from "@dmx/contracts/order-shipment-orchestration";

const applyMetadata = process.argv.includes("--apply-metadata");
const verbose = process.argv.includes("--verbose");
const jsonOutIdx = process.argv.indexOf("--json-out");
const jsonOut = jsonOutIdx >= 0 ? process.argv[jsonOutIdx + 1] : undefined;
const prisma = new PrismaClient();

function loadDocumentedExceptions() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const path = join(here, "../../../docs/desync-documented-exceptions.json");
    const raw = readFileSync(path, "utf8");
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const documented = loadDocumentedExceptions();
const documentedOrderIds = new Set(documented.map((d) => d.orderId));

const orders = await prisma.workspace.findMany({
  where: { type: "ORDER", state: { notIn: [...TERMINAL_ORDER_STATES] } },
  select: { id: true, externalRef: true, state: true, metadata: true },
});

const desyncPairs = [];
for (const order of orders) {
  const shipment = await prisma.workspace.findFirst({
    where: { spawnedFromId: order.id, type: "SHIPMENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, externalRef: true, state: true },
  });
  if (!shipment || TERMINAL_SHIPMENT_STATES.includes(shipment.state)) continue;
  const hit = evaluateOrderShipmentDesync(order.state, shipment.state);
  if (hit) {
    desyncPairs.push({
      orderId: order.id,
      orderRef: order.externalRef,
      orderState: order.state,
      shipmentId: shipment.id,
      shipmentRef: shipment.externalRef,
      shipmentState: shipment.state,
      ...hit,
    });
  }
}

if (applyMetadata) {
  const active = await prisma.workspace.findMany({
    where: {
      type: { in: ["ORDER", "SHIPMENT"] },
      state: { notIn: ["CLOSED", "CANCELLED", "REJECTED", "COMPLETED"] },
    },
    select: { id: true, metadata: true },
    take: 5000,
  });
  for (const ws of active) {
    const meta = (ws.metadata && typeof ws.metadata === "object" ? ws.metadata : {});
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { metadata: { ...meta, fsmVersion: 1 } },
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  ordersScanned: orders.length,
  desyncCount: desyncPairs.length,
  undocumentedDesyncCount: desyncPairs.filter((p) => !documentedOrderIds.has(p.orderId)).length,
  documentedExceptionCount: documented.length,
  desyncPairs,
  documentedExceptions: documented,
  metadataStamped: applyMetadata,
};

const output = JSON.stringify(report, null, 2);
if (jsonOut) {
  writeFileSync(jsonOut, output);
  if (verbose) console.error(`Wrote ${jsonOut}`);
}
console.log(output);

if (verbose && desyncPairs.length > 0) {
  console.error("\n--- Desync summary (use fsm-desync-analyze.mjs for full context) ---");
  for (const pair of desyncPairs) {
    console.error(
      `${pair.orderRef} (${pair.orderState}) ↔ ${pair.shipmentRef} (${pair.shipmentState})` +
        ` | rule=${pair.rule} severity=${pair.severity} lagging=${pair.laggingEntity}`,
    );
  }
  console.error("Run: npx tsx apps/backend/scripts/fsm-desync-analyze.mjs");
}

await prisma.$disconnect();
