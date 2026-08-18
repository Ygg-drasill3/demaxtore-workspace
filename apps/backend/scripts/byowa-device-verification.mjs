#!/usr/bin/env node
/**
 * BYOWA device verification checklist runner.
 *
 * This script CANNOT replace physical supplier phone verification.
 * It documents steps and validates server-side preconditions only.
 *
 * Usage:
 *   node scripts/byowa-device-verification.mjs --buyer-email buyer1@acme.test
 *
 * Manual steps (must be performed by a human with real Meta + phones):
 * 1. Buyer completes Meta Embedded Signup in /account/integrations/whatsapp-business
 * 2. Buyer sends message to supplier from Workspace conversation
 * 3. Supplier confirms message arrived FROM buyer's business number (not DeMaxtore shared line)
 * 4. Supplier replies with text — verify in /messages timeline
 * 5. Supplier sends image/PDF — verify media opens in timeline
 * 6. Meta webhooks: sent, delivered, read status visible on message
 */

const API_BASE = (process.env.API_BASE_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");

async function main() {
  const buyerEmail = process.argv.find((a) => a.startsWith("--buyer-email="))?.split("=")[1];
  if (!buyerEmail) {
    console.error("Usage: node scripts/byowa-device-verification.mjs --buyer-email=<email>");
    process.exit(1);
  }

  console.log("=== BYOWA Device Verification Checklist ===\n");
  console.log("AUTOMATED CHECKS (server-side only):\n");

  try {
    const health = await fetch(`${API_BASE}/api/healthz`);
    console.log(`[${health.ok ? "PASS" : "FAIL"}] API reachable (${health.status})`);
  } catch {
    console.log("[FAIL] API not reachable — start backend first");
    process.exit(1);
  }

  console.log("\nMANUAL CHECKS (required for production sign-off):\n");
  const manual = [
    "Buyer connected own WhatsApp Business via Embedded Signup",
    "Buyer sent message from Workspace — supplier received from BUYER number",
    "Meta sent/delivered/read webhooks observed (not only wamid in DB)",
    "Supplier text reply appears in same Workspace conversation",
    "Supplier image/PDF appears in timeline with correct media download",
    "Inbound media used buyer token (check logs: no cross-tenant token)",
  ];
  manual.forEach((step, i) => console.log(`  ${i + 1}. [ ] ${step}`));

  console.log("\nRESULT TEMPLATE (fill after manual test):\n");
  console.log(`  Buyer: ${buyerEmail}`);
  console.log("  Supplier received from number: __________________");
  console.log("  Supplier reply in same conversation: YES / NO");
  console.log("  Inbound media opened correctly: YES / NO");
  console.log("  Production ready: YES / NO");
  console.log("\nNote: wamid alone does NOT prove physical delivery.");
}

main();
