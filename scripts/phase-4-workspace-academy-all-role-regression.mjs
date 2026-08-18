#!/usr/bin/env node
/**
 * Phase 4 — Workspace Academy all-role regression (live UI).
 * Read-only business navigation; Academy interactions only where safe.
 *
 * Usage:
 *   node scripts/phase-4-workspace-academy-all-role-regression.mjs
 *   OUT=.phase-4-evidence/results.json node scripts/phase-4-workspace-academy-all-role-regression.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.R4_BASE_URL ?? "https://workspace.demaxtore.com";
const API = (process.env.API_BASE ?? "http://127.0.0.1:3001").replace(/\/$/, "");
const PW = process.env.E2E_PASSWORD ?? "Passw0rd!";
const OUT_DIR = process.env.OUT_DIR ?? path.join(process.cwd(), ".phase-4-evidence");
const OUT = process.env.OUT ?? path.join(OUT_DIR, "phase-4-results.json");
const R4_SHIPMENT = "9f1c326a-97ad-4937-a200-09e628251070";
const R4_CUSTOMS = "8a96c974-700e-40ba-9db0-0b331f7d4583";

fs.mkdirSync(OUT_DIR, { recursive: true });

const ROLES = [
  {
    role: "BUYER",
    email: "buyer1@acme.test",
    landing: "/buyer/products",
    layoutTestId: "app-layout",
    navChecks: [
      { path: "/buyer/products", label: "Product Master", testId: "product-list-page" },
      { path: "/buyer/purchase-orders", label: "PO list" },
      { path: "/buyer/shipments", label: "Shipments" },
      { path: "/buyer/customs", label: "Customs" },
      { path: "/buyer/inland", label: "Inland" },
      { path: "/buyer/landed-cost", label: "Landed Cost" },
    ],
  },
  {
    role: "ADMIN",
    email: "admin@demaxtore.local",
    landing: "/admin",
    layoutTestId: "app-layout",
    navChecks: [
      { path: "/admin", label: "Admin home" },
      { path: "/admin/freight-bookings", label: "Freight bookings" },
      { path: "/admin/customs", label: "Customs ops" },
      { path: "/admin/inland", label: "Inland ops" },
      { path: "/admin/control-tower", label: "Control Tower" },
    ],
  },
  {
    role: "SUPPLIER",
    email: "supplier1@acme-mfg.test",
    landing: "/supplier/dashboard",
    layoutTestId: "app-layout",
    navChecks: [
      { path: "/supplier/dashboard", label: "Supplier dashboard", testId: "supplier-dashboard" },
      { path: "/supplier/rfq", label: "RFQ" },
      { path: "/supplier/orders", label: "Orders" },
    ],
  },
  {
    role: "CUSTOMS_BROKER",
    email: "broker.smoke@demaxtore.local",
    landing: "/partner",
    layoutTestId: "app-layout",
    navChecks: [
      { path: "/partner", label: "Partner home" },
      { path: "/partner/customs", label: "My Customs Cases", testId: "partner-customs-cases-page" },
      { path: `/partner/customs/${R4_CUSTOMS}`, label: "R4 customs case (read-only)" },
      { path: "/partner", label: "Return partner home" },
    ],
  },
  {
    role: "TRUCKER",
    email: "trucker.smoke@demaxtore.local",
    landing: "/partner",
    layoutTestId: "app-layout",
    navChecks: [
      { path: "/partner", label: "Partner home" },
      { path: "/partner/inland", label: "My Deliveries" },
      { path: "/partner", label: "Return partner home" },
    ],
  },
  {
    role: "ORIGIN_AGENT",
    email: "origin.agent.smoke@demaxtore.local",
    landing: "/partner",
    layoutTestId: "app-layout",
    navChecks: [
      { path: "/partner", label: "Partner home" },
    ],
  },
];

async function health() {
  const hz = await fetch(`${API}/api/healthz`);
  const rd = await fetch(`${API}/api/ready`);
  return { healthz: hz.status, ready: rd.status };
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(PW);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
}

async function logout(page) {
  const logout = page.getByRole("button", { name: /log out/i }).first();
  if (await logout.count()) {
    await logout.click();
    await page.waitForURL((u) => u.pathname.includes("/login"), { timeout: 15000 }).catch(() => {});
  } else {
    await page.goto(`${BASE}/login`);
  }
}

function classifyConsole(msg) {
  const text = msg.text();
  if (/academy.*persist/i.test(text) || /\[academy\]/i.test(text)) return "academy-persist";
  if (/academy/i.test(text)) return "academy-other";
  return "other";
}

async function runRole(context, spec, collectors) {
  const page = await context.newPage();
  const roleResult = {
    role: spec.role,
    login: { ok: false },
    landing: { ok: false },
    layout: { ok: false },
    academyState: null,
    academyInit: { ok: false, helpButton: false },
    navigation: [],
    helpCenter: { ok: false, tested: false },
    consoleErrors: [],
    pageErrors: [],
    academyRequests: [],
    rawKeys: [],
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      collectors.consoleErrors.push({ role: spec.role, type: classifyConsole(msg), text: msg.text().slice(0, 300) });
      roleResult.consoleErrors.push(msg.text().slice(0, 200));
    }
  });
  page.on("pageerror", (err) => {
    collectors.pageErrors.push({ role: spec.role, error: String(err).slice(0, 300) });
    roleResult.pageErrors.push(String(err).slice(0, 200));
  });
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/workspace-academy/") || url.includes("/api/telemetry")) {
      const entry = { role: spec.role, url: url.replace(BASE, "").replace(API, ""), status: res.status() };
      collectors.academyNetwork.push(entry);
      roleResult.academyRequests.push(entry);
    }
  });

  try {
    await login(page, spec.email);
    roleResult.login.ok = true;

    await page.goto(`${BASE}${spec.landing}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1200);
    roleResult.landing.ok = !page.url().includes("/login");

    const layout = page.getByTestId(spec.layoutTestId);
    await layout.waitFor({ timeout: 15000 });
    roleResult.layout.ok = true;

    // Academy state fetch
    const stateResp = await page.waitForResponse(
      (r) => r.url().includes("/workspace-academy/state") && r.status() < 500,
      { timeout: 20000 },
    ).catch(() => null);
    if (stateResp) {
      roleResult.academyState = await stateResp.json().catch(() => null);
      roleResult.academyInit.ok = stateResp.status() === 200;
    }

    const helpBtn = page.getByTestId("academy-help-button");
    roleResult.academyInit.helpButton = (await helpBtn.count()) > 0;

    // Check no raw i18n keys in visible body
    const body = await page.locator("body").innerText();
    roleResult.rawKeys = ["wa.", "academy.", "[object Object]"].filter((k) => body.includes(k));

    for (const nav of spec.navChecks) {
      const item = { ...nav, ok: false, url: null, blank: false };
      try {
        await page.goto(`${BASE}${nav.path}`, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(1000);
        item.url = page.url();
        const txt = await page.locator("body").innerText();
        item.blank = txt.trim().length < 30;
        if (nav.testId) await page.getByTestId(nav.testId).waitFor({ timeout: 15000 });
        item.ok = !item.blank && !txt.includes("Application error") && !txt.includes("Something went wrong");
      } catch (e) {
        item.error = String(e).slice(0, 150);
      }
      roleResult.navigation.push(item);
    }

    // Help Center entry (all roles with provider)
    if (roleResult.academyInit.helpButton) {
      roleResult.helpCenter.tested = true;
      try {
        await page.goto(`${BASE}${spec.landing}`, { waitUntil: "networkidle", timeout: 60000 });
        await helpBtn.click();
        await page.waitForTimeout(800);
        const drawer = page.locator('[role="dialog"], [data-testid="help-center-panel"]').first();
        await drawer.waitFor({ timeout: 8000 }).catch(() => {});
        const visible = await drawer.isVisible().catch(() => false);
        // close via escape
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        roleResult.helpCenter.ok = visible;
      } catch (e) {
        roleResult.helpCenter.error = String(e).slice(0, 150);
      }
    }

    const shot = path.join(OUT_DIR, `${spec.role.toLowerCase()}-landing.png`);
    await page.screenshot({ path: shot, fullPage: true });
    roleResult.screenshot = shot;
  } catch (err) {
    roleResult.fatal = String(err).slice(0, 300);
  } finally {
    await logout(page).catch(() => {});
    await page.close();
  }

  return roleResult;
}

async function persistenceBuyer(context, collectors) {
  const page = await context.newPage();
  const result = { role: "BUYER", dismissChecklist: null, refresh: null, relogin: null, userB: null };
  try {
    await login(page, "buyer1@acme.test");
    await page.goto(`${BASE}/buyer/products`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForResponse((r) => r.url().includes("/workspace-academy/state"), { timeout: 20000 });

    // Dismiss welcome if shown (safe UI)
    const skipWelcome = page.getByRole("button", { name: /skip|dismiss|later|not now/i }).first();
    if (await skipWelcome.count()) {
      await skipWelcome.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    const stateBefore = await page.evaluate(async () => {
      const r = await fetch("/api/workspace-academy/state", { credentials: "include", headers: { Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}` } });
      return r.ok ? r.json() : null;
    }).catch(() => null);

    // Use help center restart visibility as proxy — dismiss checklist via API intercept not allowed;
    // instead complete welcome dismiss via UI if checklist visible
    const checklist = page.locator('[data-testid="academy-checklist"], [data-guide="onboarding-checklist"]').first();
    if (await checklist.count()) {
      const dismiss = page.getByRole("button", { name: /dismiss|hide|close checklist|exit onboarding/i }).first();
      if (await dismiss.count()) {
        await dismiss.click();
        await page.waitForTimeout(800);
        result.dismissChecklist = { ok: true, method: "ui-dismiss" };
      }
    }

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const layoutOk = (await page.getByTestId("app-layout").count()) > 0;
    result.refresh = { ok: layoutOk };

    await logout(page);
    await login(page, "buyer1@acme.test");
    await page.goto(`${BASE}/buyer/products`, { waitUntil: "networkidle" });
    result.relogin = { ok: (await page.getByTestId("app-layout").count()) > 0 };

    // User B isolation — login buyer2, state should differ user-scoped
    await logout(page);
    await login(page, "buyer2@beta.test");
    await page.goto(`${BASE}/buyer/products`, { waitUntil: "networkidle" });
    const stateB = await page.waitForResponse((r) => r.url().includes("/workspace-academy/state"), { timeout: 20000 }).then((r) => r.json()).catch(() => null);
    result.userB = {
      ok: Boolean(stateB),
      sameAsA: JSON.stringify(stateB) === JSON.stringify(stateBefore),
    };
  } catch (e) {
    result.error = String(e).slice(0, 200);
  } finally {
    await page.close();
  }
  collectors.persistence = result;
  return result;
}

async function persistenceFailure(context, collectors) {
  const page = await context.newPage();
  const result = { ok: false, persistFailedEvents: [], appUsable: false, consoleWarnings: [] };
  page.on("console", (msg) => {
    if (/academy.*persist|\[academy\]/i.test(msg.text())) result.consoleWarnings.push(msg.text().slice(0, 200));
  });

  // Capture telemetry posts
  const telemetryHits = [];
  await page.route("**/api/telemetry**", async (route) => {
    const body = route.request().postDataJSON?.() ?? {};
    if (body?.event === "academy.persist_failed") telemetryHits.push(body);
    await route.continue();
  });

  await page.route("**/api/workspace-academy/guides/**/start**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "SIMULATED" } }) }),
  );

  try {
    await login(page, "buyer1@acme.test");
    await page.goto(`${BASE}/buyer/products`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);

    // Trigger guide if auto-launches — navigate to RFQ list which often has auto guide
    await page.goto(`${BASE}/buyer/rfq`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);

    result.appUsable = (await page.getByTestId("app-layout").count()) > 0;
    const body = await page.locator("body").innerText();
    result.blank = body.trim().length < 30;
    result.persistFailedEvents = telemetryHits;
    result.consoleWarnings = [...new Set(result.consoleWarnings)];
    result.ok = result.appUsable && !result.blank && (telemetryHits.length > 0 || result.consoleWarnings.length > 0);
  } catch (e) {
    result.error = String(e).slice(0, 200);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.close();
  }
  collectors.persistenceFailure = result;
  return result;
}

async function main() {
  console.error(`Phase 4 Academy regression → ${BASE}\n`);
  const healthBefore = await health();
  const collectors = { consoleErrors: [], pageErrors: [], academyNetwork: [] };
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const roleResults = [];
  for (const spec of ROLES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    console.error(`→ ${spec.role}`);
    roleResults.push(await runRole(ctx, spec, collectors));
    await ctx.close();
  }

  const persistCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await persistenceBuyer(persistCtx, collectors);
  await persistCtx.close();

  const failCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await persistenceFailure(failCtx, collectors);
  await failCtx.close();

  await browser.close();
  const healthAfter = await health();

  const fails = roleResults.filter((r) => r.fatal || !r.login.ok || !r.layout.ok || r.pageErrors.length);
  const navFails = roleResults.flatMap((r) => r.navigation.filter((n) => !n.ok).map((n) => ({ role: r.role, ...n })));
  const academy5xx = collectors.academyNetwork.filter((n) => n.status >= 500 && !String(n.url).includes("SIMULATED"));
  const unexplainedPageErrors = collectors.pageErrors.filter((e) => !/ResizeObserver|chunk/i.test(e.error));

  const summary = {
    phase: "PHASE_4",
    base: BASE,
    api: API,
    at: new Date().toISOString(),
    healthBefore,
    healthAfter,
    roleResults,
    persistence: collectors.persistence,
    persistenceFailure: collectors.persistenceFailure,
    consoleErrors: collectors.consoleErrors,
    pageErrors: collectors.pageErrors,
    academyNetwork: collectors.academyNetwork,
    totals: {
      roles: roleResults.length,
      loginPass: roleResults.filter((r) => r.login.ok).length,
      layoutPass: roleResults.filter((r) => r.layout.ok).length,
      navFails: navFails.length,
      academy5xx: academy5xx.length,
      unexplainedPageErrors: unexplainedPageErrors.length,
      persistFailureResilience: collectors.persistenceFailure?.ok ?? false,
    },
    navFails,
  };

  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ totals: summary.totals, out: OUT, navFails, persistFailure: summary.persistenceFailure?.ok }, null, 2));
  if (fails.length || navFails.length || academy5xx.length || unexplainedPageErrors.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
