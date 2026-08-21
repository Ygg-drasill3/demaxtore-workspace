#!/usr/bin/env node
/**
 * Local buyer isolation smoke — International vs Turkey Importer chrome.
 * Requires local frontend+backend (default http://localhost:3000).
 *
 *   node scripts/local-buyer-isolation-smoke.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const PW = process.env.E2E_PASSWORD ?? "Passw0rd!";

const USERS = {
  international: "demo.buyer@demaxtore.com",
  turkey: "buyer.utest@demaxtore.local",
};

const failures = [];

function ok(name, detail = "") {
  console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  console.error(`[FAIL] ${name} — ${detail}`);
  failures.push({ name, detail });
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(PW);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45000 });
}

async function logout(page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
}

async function gotoExpect(page, path, expectIncludes, label) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  try {
    await page.waitForFunction(
      (needle) => window.location.href.includes(needle),
      expectIncludes,
      { timeout: 20000 },
    );
    ok(label, page.url());
  } catch {
    fail(label, `ended at ${page.url()} (wanted includes "${expectIncludes}")`);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const body = await page.locator("body").innerText();
    if (/FreightIQ/i.test(body)) fail("login-marketing", "FreightIQ still visible on login");
    else ok("login-marketing", "no FreightIQ");

    await login(page, USERS.international);
    await page.goto(`${BASE}/buyer/dashboard`, { waitUntil: "networkidle" }).catch(() => {});
    await page.getByRole("button", { name: /open menu/i }).click().catch(() => {});
    const freightNav = await page.getByTestId("buyer-freightiq").count();
    if (freightNav > 0) fail("intl-no-freight-nav", "Freight still in nav");
    else ok("intl-no-freight-nav");

    await gotoExpect(page, "/buyer/freightiq", "/buyer/dashboard", "intl-freight-hub-redirect");
    await gotoExpect(page, "/buyer/freightiq/request", "/buyer/dashboard", "intl-freight-request-redirect");
    await gotoExpect(page, "/buyer/customs", "/buyer/dashboard", "intl-customs-redirect");
    await gotoExpect(page, "/buyer/rfq", "/buyer/rfq", "intl-rfq");

    await logout(page);

    await login(page, USERS.turkey);
    await page.goto(`${BASE}/buyer/dashboard`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForSelector('[data-testid="buyer-get-freight-quote"], [data-testid="buyer-dashboard"]', {
      timeout: 20000,
    });
    const hero = await page.getByTestId("buyer-get-freight-quote").count();
    if (hero < 1) fail("turkey-freight-cta", "missing Get freight quote CTA");
    else ok("turkey-freight-cta");

    await gotoExpect(page, "/buyer/freightiq", "/buyer/freightiq", "turkey-freight-hub");
    await gotoExpect(page, "/buyer/freightiq/request", "/buyer/freightiq/request", "turkey-freight-request");
  } catch (e) {
    fail("runner", String(e?.message ?? e));
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("\nAll buyer isolation smoke checks passed.");
}

run();
