#!/usr/bin/env node
/**
 * Phase 17 R4 — Environment recovery smoke (Step 1).
 * Verifies browser stability + all four pilot role logins via UI.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.R4_BASE_URL ?? "https://workspace.demaxtore.com";
const PW = process.env.E2E_PASSWORD ?? "Passw0rd!";
const OUT = path.join(process.cwd(), ".r4-ui-fixtures", "env-smoke");
fs.mkdirSync(OUT, { recursive: true });

const USERS = [
  { role: "BUYER", email: "buyer1@acme.test", afterLogin: "/buyer/products", testId: "product-list-page" },
  { role: "ADMIN", email: "admin@demaxtore.local", afterLogin: "/admin", testId: null },
  { role: "CUSTOMS_BROKER", email: "broker.smoke@demaxtore.local", afterLogin: "/partner", testId: null },
  { role: "TRUCKER", email: "trucker.smoke@demaxtore.local", afterLogin: "/partner", testId: null },
];

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

async function main() {
  const results = { base: BASE, at: new Date().toISOString(), checks: [], screenshots: [], ok: true };

  console.log(`Phase 17 R4 env smoke → ${BASE}\n`);

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Keep session alive across multiple navigations
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const shot0 = path.join(OUT, "00-login-page.png");
  await page.screenshot({ path: shot0, fullPage: true });
  results.screenshots.push(shot0);
  results.checks.push({ name: "login_page", ok: true });
  console.log("✓ Login page reachable + screenshot");

  for (const user of USERS) {
    try {
      await login(page, user.email);
      const url = page.url();
      results.checks.push({ name: `${user.role}_login`, ok: true, url });

      await page.goto(`${BASE}${user.afterLogin}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(1500);
      if (user.testId) {
        await page.waitForSelector(`[data-testid="${user.testId}"]`, { timeout: 20000 });
      }
      const shot = path.join(OUT, `${user.role.toLowerCase()}-dashboard.png`);
      await page.screenshot({ path: shot, fullPage: true });
      results.screenshots.push(shot);

      // Extra navigation to prove browser stays alive
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }).catch(() => {});
      await logout(page);
      results.checks.push({ name: `${user.role}_logout`, ok: true });
      console.log(`✓ ${user.role} login/logout + navigation`);
    } catch (err) {
      results.ok = false;
      results.checks.push({ name: `${user.role}_login`, ok: false, error: String(err) });
      console.error(`✗ ${user.role} failed:`, err.message);
      const failShot = path.join(OUT, `${user.role.toLowerCase()}-FAIL.png`);
      await page.screenshot({ path: failShot, fullPage: true }).catch(() => {});
      break;
    }
  }

  // Final stability: buyer session + multi-page hop
  if (results.ok) {
    await login(page, "buyer1@acme.test");
    for (const p of ["/buyer/products", "/buyer/purchase-orders", "/buyer/shipments"]) {
      await page.goto(`${BASE}${p}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(1000);
    }
    const shotFinal = path.join(OUT, "99-buyer-multi-nav.png");
    await page.screenshot({ path: shotFinal, fullPage: true });
    results.screenshots.push(shotFinal);
    await page.waitForTimeout(5000);
    results.checks.push({ name: "browser_stability_5s", ok: true });
    console.log("✓ Buyer multi-page navigation + 5s stability hold");
  }

  await browser.close();

  const reportPath = path.join(OUT, "env-smoke-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nReport: ${reportPath}`);
  console.log(results.ok ? "\nENV SMOKE: PASS" : "\nENV SMOKE: FAIL");
  process.exit(results.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("ENV SMOKE CRASH:", e);
  process.exit(1);
});
