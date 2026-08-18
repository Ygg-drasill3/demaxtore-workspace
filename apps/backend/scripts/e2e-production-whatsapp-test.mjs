#!/usr/bin/env node
/**
 * Production E2E: buyer /messages flow → Meta API → supplier whatsappPhone
 */
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const API_BASE = (process.env.E2E_API_URL ?? "http://localhost:3001").replace(/\/$/, "").replace(/\/api$/, "");
const CONVERSATION_ID = process.env.E2E_CONV_ID ?? "a0ee306d-8e36-4719-8dc3-6e57dfae4890";
const BUYER_EMAIL = process.env.E2E_BUYER_EMAIL ?? "buyer1@acme.test";
const BUYER_PASSWORD = process.env.E2E_BUYER_PASSWORD ?? "Passw0rd!";
const SUPPLIER_USER_ID = process.env.E2E_SUPPLIER_ID ?? "fb59bee5-0f33-4ac9-bb0e-b9964b7f9f9a";
const BUSINESS_PHONE = (process.env.WHATSAPP_BUSINESS_PHONE_E164 ?? "905518659442").replace(/\D/g, "");

const prisma = new PrismaClient();

function maskPhone(phone) {
  const d = String(phone).replace(/\D/g, "");
  if (d.length < 6) return "***";
  return `+${d.slice(0, 5)}***${d.slice(-2)}`;
}

async function login() {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: BUYER_EMAIL, password: BUYER_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  return data.accessToken ?? data.token ?? data.data?.accessToken;
}

async function sendMessage(token, body) {
  const clientMessageId = randomUUID();
  const res = await fetch(`${API_BASE}/api/messaging/conversations/${CONVERSATION_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": clientMessageId,
    },
    body: JSON.stringify({ body, clientMessageId }),
  });
  const data = await res.json();
  return { status: res.status, data, clientMessageId };
}

async function pollStatus(wamid, maxAttempts = 12) {
  const statuses = [];
  for (let i = 0; i < maxAttempts; i++) {
    const wa = await prisma.whatsAppMessage.findFirst({
      where: { metaMessageId: wamid },
      select: { status: true, sentAt: true, deliveredAt: true, readAt: true, failedAt: true },
    });
    const ws = await prisma.workspaceMessage.findFirst({
      where: { whatsappMessageId: wamid },
      select: { sentAt: true, deliveredAt: true, readAt: true, failedAt: true },
    });
    statuses.push({ attempt: i + 1, wa, ws });
    if (wa?.deliveredAt || wa?.readAt || wa?.failedAt) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return statuses;
}

async function main() {
  const supplier = await prisma.user.findUnique({
    where: { id: SUPPLIER_USER_ID },
    select: { email: true, whatsappPhone: true },
  });
  if (!supplier?.whatsappPhone) throw new Error("Supplier whatsappPhone missing");

  const supplierDigits = supplier.whatsappPhone.replace(/\D/g, "");
  const testBody = `E2E production test ${new Date().toISOString()}`;

  console.log("=== Production E2E WhatsApp Test ===");
  console.log(`Supplier: ${supplier.email}`);
  console.log(`Supplier whatsappPhone (masked): ${maskPhone(supplierDigits)}`);
  console.log(`Conversation: ${CONVERSATION_ID}`);
  console.log(`API: ${API_BASE}`);

  const token = await login();
  console.log("Buyer login: OK");

  const { status, data } = await sendMessage(token, testBody);
  console.log(`Send HTTP status: ${status}`);
  if (status !== 201 && status !== 200) {
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const wamid = data.externalMessageId ?? data.whatsappMessageId ?? data.external_message_id;
  const workspaceMsgId = data.id;
  console.log(`Workspace message id: ${workspaceMsgId}`);
  console.log(`Meta wamid: ${wamid ?? "MISSING"}`);

  const waOutbound = await prisma.whatsAppMessage.findFirst({
    where: wamid ? { metaMessageId: wamid } : { body: { contains: testBody.slice(0, 30) } },
    orderBy: { createdAt: "desc" },
    include: { conversation: { include: { contact: true } } },
  });

  const toPhone = waOutbound?.conversation?.contact?.waId ?? supplierDigits;
  console.log(`Meta payload to (masked): ${maskPhone(toPhone)}`);
  console.log(`to === supplier.whatsappPhone: ${toPhone.replace(/\D/g, "") === supplierDigits}`);
  console.log(`to !== businessPhone: ${toPhone.replace(/\D/g, "") !== BUSINESS_PHONE}`);

  if (!wamid?.startsWith("wamid.")) {
    console.error("FAIL: No real Meta wamid returned");
    process.exit(1);
  }

  console.log("Polling delivery status (up to 60s)...");
  const statusLog = await pollStatus(wamid);
  const last = statusLog[statusLog.length - 1];
  console.log("Delivery status:", JSON.stringify(last, null, 2));

  // Check inbound mirror capability — simulate supplier reply webhook
  console.log("\n--- Simulating supplier inbound reply webhook ---");
  // Inbound mirror test via compiled handler
  const { UnifiedMessagingInboundHandler } = await import(
    "../dist/modules/unified-messaging/unified-messaging-inbound.handler.js"
  );
  const { WhatsAppInboxService } = await import("../dist/modules/whatsapp-inbox/whatsapp-inbox.service.js");
  const inbox = new WhatsAppInboxService(prisma);
  const fakeWamid = `wamid.e2e.inbound.${Date.now()}`;
  const inboundResult = await inbox.ingestInbound({
    waId: supplierDigits,
    metaMessageId: fakeWamid,
    type: "text",
    body: `Supplier reply E2E ${new Date().toISOString()}`,
    timestamp: new Date(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "default",
    profileName: supplier.email,
  });
  console.log("Inbound ingest:", inboundResult);

  const mirrored = await prisma.workspaceMessage.findFirst({
    where: {
      conversationId: CONVERSATION_ID,
      direction: "INBOUND",
      body: { contains: "Supplier reply E2E" },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Inbound mirrored to workspace_messages: ${mirrored ? "YES" : "NO"}`);
  if (mirrored) console.log(`Mirrored message id: ${mirrored.id}`);

  const timeline = await prisma.workspaceMessage.findMany({
    where: { conversationId: CONVERSATION_ID },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, direction: true, channelSource: true, body: true, whatsappMessageId: true },
  });
  console.log("\nRecent timeline:", JSON.stringify(timeline, null, 2));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
