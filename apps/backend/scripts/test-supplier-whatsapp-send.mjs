#!/usr/bin/env node
/**
 * Live device test: buyer message → Meta WhatsApp Cloud API → supplier phone.
 *
 * Usage (from apps/backend):
 *   node scripts/test-supplier-whatsapp-send.mjs \
 *     --to=905322222222 \
 *     --body="DeMaxtore device test"
 *
 * Requires WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in apps/backend/.env
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const supplierPhone = (args.to ?? "").replace(/\D/g, "");
const body = args.body ?? `DeMaxtore device test ${new Date().toISOString()}`;
const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v21.0";
const businessPhone = (process.env.WHATSAPP_BUSINESS_PHONE_E164 ?? "905518659442").replace(/\D/g, "");

function maskPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  return `+${digits.slice(0, 5)}***${digits.slice(-2)}`;
}

if (!supplierPhone) {
  console.error("Missing --to=<supplier E.164 digits e.g. 905322222222>");
  process.exit(1);
}
if (!token || !phoneNumberId) {
  console.error("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set.");
  process.exit(1);
}
if (supplierPhone === businessPhone) {
  console.error("Refusing to send: --to matches DeMaxtore business line.");
  process.exit(1);
}

const payload = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: supplierPhone,
  type: "text",
  text: { body: body.slice(0, 4096), preview_url: false },
};

const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

console.log("--- DeMaxtore supplier WhatsApp device test ---");
console.log(`Meta URL: ${url}`);
console.log(`Payload to (masked): ${maskPhone(supplierPhone)}`);
console.log(`to === supplier.whatsappPhone: true (input)`);
console.log(`to !== businessPhone: ${supplierPhone !== businessPhone}`);

const resp = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const data = await resp.json();
if (!resp.ok) {
  console.error("Meta API error:", JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("Meta response OK");
console.log(`wamid: ${data.messages?.[0]?.id ?? "n/a"}`);
console.log("Verify the message on the supplier physical device.");
