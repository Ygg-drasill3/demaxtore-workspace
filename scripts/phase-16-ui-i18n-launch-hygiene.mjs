#!/usr/bin/env node
/**
 * Phase 16 — Turkey MVP UI / I18N Launch Hygiene Validation
 * Read-only browser smoke against production pilot UI.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.PHASE16_BASE_URL ?? "https://workspace.demaxtore.com";
const PW = process.env.E2E_PASSWORD ?? "Passw0rd!";
const OUT = process.env.PHASE16_OUT ?? path.join(process.cwd(), ".phase-16-evidence");
fs.mkdirSync(OUT, { recursive: true });

const R4 = {
  marker: "MVP-UI17-R4-20260814-R2M5",
  productId: "b5748ad0-ba1d-4c7f-9402-3352c41ba606",
  poId: "32ce9003-af7e-438e-aa21-0848c8e338c1",
  shipmentId: "9f1c326a-97ad-4937-a200-09e628251070",
  customsCaseId: "8a96c974-700e-40ba-9db0-0b331f7d4583",
  inlandId: "5110057f-904d-4219-95e3-689aa6cf701c",
  landedCostId: "54bd93ab-cdd8-4da7-8dc5-8bea6c08a93c",
};

const FORBIDDEN_UI = [
  /\bUUID\b/i,
  /\bPrisma\b/i,
  /\[object Object\]/,
  /translation_missing/i,
  /\bundefined\b/,
  /\bNaN\b/,
  /Cannot read properties/,
  /500 Internal Server Error/,
  /\bbuyRate\b/i,
  /\binternalMargin\b/i,
  /\bmarginUsd\b/i,
  /common\.[a-z]+\.[a-z]+/,
  /shipment\.[a-z]+\.[a-z]+/,
];

const RAW_ENUM_PATTERNS = [
  "READY_FOR_BROKER",
  "NOT_EVALUATED",
  "PROOF_OF_DELIVERY",
  "LANDED_COST_RISK",
];

const results = {
  at: new Date().toISOString(),
  base: BASE,
  screens: [],
  findings: [],
  consoleErrors: [],
  network: { s5xx: 0, unexpected404: [], unexpected403: [] },
  counts: { flowBreakingConsole: 0, ui404: 0, ui403: 0, s5xx: 0 },
};

function finding(severity, code, msg, extra = {}) {
  results.findings.push({ severity, code, msg, ...extra });
}

function recordScreen(role, route, label, status, notes = []) {
  results.screens.push({ role, route, label, status, notes });
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(PW);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
}

async function inspectPage(page, ctx) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const title = await page.title().catch(() => "");
  const url = page.url();

  for (const pat of FORBIDDEN_UI) {
    if (pat.test(bodyText)) {
      finding("P0", "FORBIDDEN_TEXT", `Forbidden pattern ${pat} on ${ctx.label}`, { url, role: ctx.role });
    }
  }

  for (const raw of RAW_ENUM_PATTERNS) {
    if (bodyText.includes(raw)) {
      finding("P2", "RAW_ENUM", `Raw enum "${raw}" visible on ${ctx.label}`, { url, role: ctx.role });
    }
  }

  if (/Loading…/.test(bodyText) && !/Loading/.test(await page.content())) {
    /* ok */
  }

  const blank = bodyText.trim().length < 20 && !title.includes("Sign In");
  if (blank) {
    finding("P1", "BLANK_PAGE", `Near-blank page at ${ctx.label}`, { url, role: ctx.role });
  }

  return { bodyText: bodyText.slice(0, 4000), title, url };
}

async function visit(page, ctx, route, label, opts = {}) {
  const { testId, expectText, screenshot = true } = opts;
  const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(1200);

  let status = "PASS";
  const notes = [];
  if (resp && resp.status() >= 500) {
    status = "FAIL";
    notes.push(`http ${resp.status()}`);
    finding("P0", "HTTP_5XX", `${label} returned ${resp.status()}`, { route, role: ctx.role });
  }

  if (testId) {
    const el = page.locator(`[data-testid="${testId}"]`);
    if ((await el.count()) === 0) {
      status = status === "FAIL" ? "FAIL" : "FRICTION";
      notes.push(`missing testId ${testId}`);
    }
  }

  if (expectText) {
    const body = await page.locator("body").innerText();
    if (!body.includes(expectText)) {
      status = status === "FAIL" ? "FAIL" : "FRICTION";
      notes.push(`expected text "${expectText}" not found`);
    }
  }

  const info = await inspectPage(page, { ...ctx, label });
  recordScreen(ctx.role, route, label, status, notes);

  if (screenshot) {
    const safe = `${ctx.role}-${label}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    await page.screenshot({ path: path.join(OUT, `${safe}.png`), fullPage: true }).catch(() => {});
  }

  return info;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROME ?? "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      results.consoleErrors.push(t.slice(0, 300));
      if (!/favicon|404.*\.map|ResizeObserver|chunk|devtools/i.test(t)) {
        results.counts.flowBreakingConsole += 1;
      }
    }
  });

  page.on("response", (resp) => {
    const url = resp.url();
    const st = resp.status();
    if (st >= 500 && url.includes("/api/")) {
      results.network.s5xx += 1;
      results.counts.s5xx += 1;
      finding("P0", "API_5XX", `API ${st} ${url}`, {});
    }
    if (st === 404 && url.includes("/api/") && !/favicon|\.map/.test(url)) {
      results.network.unexpected404.push(url);
    }
    if (st === 403 && url.includes("/api/sales/")) {
      /* expected for some roles */
    }
  });

  // BUYER — R4 Golden Path surfaces (read-only)
  await login(page, "buyer1@acme.test");
  const buyer = { role: "BUYER", email: "buyer1@acme.test" };

  await visit(page, buyer, "/buyer/dashboard", "buyer-dashboard");
  await visit(page, buyer, "/buyer/products", "product-list", { testId: "product-list-page" });
  await visit(page, buyer, `/buyer/products/${R4.productId}`, "product-detail");
  await visit(page, buyer, "/buyer/purchase-orders", "po-list");
  await visit(page, buyer, `/workspace/purchase-order/${R4.poId}`, "po-workspace");
  await visit(page, buyer, "/buyer/shipments", "shipments-list");
  await visit(page, buyer, `/workspace/shipment/${R4.shipmentId}`, "shipment-workspace");
  await visit(page, buyer, `/buyer/customs/${R4.customsCaseId}`, "customs-case");
  await visit(page, buyer, `/buyer/inland/${R4.inlandId}`, "inland-delivery");
  await visit(page, buyer, "/buyer/landed-cost", "landed-cost-list", { testId: "landed-cost-list-page" });
  await visit(page, buyer, `/buyer/landed-cost/${R4.landedCostId}`, "landed-cost-detail", {
    testId: "landed-cost-detail-page",
  });
  await visit(page, buyer, "/buyer/trade-documents", "trade-documents");

  // Check buyer nav for landed cost link
  const navText = await page.locator('[data-testid="nav-group-import"], nav, aside').first().innerText().catch(() => "");
  if (!/landed cost/i.test(navText)) {
    finding("P1", "TLC_NAV", "True Landed Cost not in buyer sidebar navigation", { role: "BUYER" });
  }

  // BROKER
  await page.goto(`${BASE}/login`);
  await login(page, "broker.smoke@demaxtore.local");
  const broker = { role: "CUSTOMS_BROKER", email: "broker.smoke@demaxtore.local" };
  await visit(page, broker, "/partner", "partner-home");
  await visit(page, broker, "/partner/customs", "my-customs-cases", { testId: "my-customs-cases" });
  await visit(page, broker, `/partner/customs/${R4.customsCaseId}`, "customs-case-exec");

  const brokerBody = await page.locator("body").innerText();
  if (/margin|buy rate|landed cost|duty & tax/i.test(brokerBody) && /DeMaxtore margin/i.test(brokerBody)) {
    finding("P0", "MARGIN_LEAK", "Broker UI may expose margin", { role: "CUSTOMS_BROKER" });
  }

  // TRUCKER
  await page.goto(`${BASE}/login`);
  await login(page, "trucker.smoke@demaxtore.local");
  const trucker = { role: "TRUCKER", email: "trucker.smoke@demaxtore.local" };
  await visit(page, trucker, "/partner", "partner-home");
  await visit(page, trucker, "/partner/inland", "my-deliveries", { testId: "my-deliveries" });
  await visit(page, trucker, `/partner/inland/${R4.inlandId}`, "delivery-exec");

  const truckerBody = await page.locator("body").innerText();
  if (/\bDuty\b.*\bTax\b/i.test(truckerBody) || /Landed Cost/i.test(truckerBody)) {
    finding("P1", "TRUCKER_FINANCE", "Trucker UI shows duty/tax or landed cost", { role: "TRUCKER" });
  }

  // SUPPLIER
  await page.goto(`${BASE}/login`);
  await login(page, "supplier1@acme-mfg.test");
  const supplier = { role: "SUPPLIER", email: "supplier1@acme-mfg.test" };
  await visit(page, supplier, "/supplier/dashboard", "supplier-dashboard");
  await visit(page, supplier, "/supplier/orders", "supplier-orders");

  // ORIGIN AGENT
  await page.goto(`${BASE}/login`);
  await login(page, "origin.agent.smoke@demaxtore.local");
  const origin = { role: "ORIGIN_AGENT", email: "origin.agent.smoke@demaxtore.local" };
  await visit(page, origin, "/partner", "partner-home");

  // ADMIN
  await page.goto(`${BASE}/login`);
  await login(page, "admin@demaxtore.local");
  const admin = { role: "ADMIN", email: "admin@demaxtore.local" };
  await visit(page, admin, "/admin/dashboard", "admin-dashboard");
  await visit(page, admin, "/operations", "operations-center");
  await visit(page, admin, `/workspace/shipment/${R4.shipmentId}`, "admin-shipment");

  await browser.close();

  results.counts.ui404 = results.network.unexpected404.length;
  results.counts.newP0 = results.findings.filter((f) => f.severity === "P0").length;
  results.counts.newP1 = results.findings.filter((f) => f.severity === "P1").length;
  results.counts.newP2 = results.findings.filter((f) => f.severity === "P2").length;

  const outFile = path.join(OUT, "phase-16-results.json");
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({
    out: outFile,
    screens: results.screens.length,
    findings: results.findings,
    s5xx: results.counts.s5xx,
    consoleErrors: results.counts.flowBreakingConsole,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
