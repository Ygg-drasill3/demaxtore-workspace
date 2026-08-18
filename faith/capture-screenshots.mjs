#!/usr/bin/env node
/**
 * Captures RFQ / Mixed Container screenshots into faith/
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE = process.env.E2E_FRONTEND_URL || "http://localhost:3000";
const PW = "Passw0rd!";

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(1500);
  if (!page.url().includes("/login")) return;
  await page.getByTestId("login-email").fill("buyer1@acme.test");
  await page.getByTestId("login-password").fill(PW);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 20000 });
  await page.waitForTimeout(1000);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  // 1–3: Design mockups (Mixed Container catalog + basket — Sprint 12A wireframes)
  const mockups = [
    ["01-category-screen.png", "mockups/catalog-category.html"],
    ["02-product-list.png", "mockups/catalog-products.html"],
    ["03-container-planner-basket.png", "mockups/container-basket.html"],
  ];
  for (const [name, html] of mockups) {
    const file = path.join(OUT, html);
    await page.goto(`file://${file}`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
    console.log(`✓ ${name}`);
  }

  // 4–5: Live app screenshots
  await login(page);

  await page.goto(`${BASE}/buyer/rfq/new`);
  await page.waitForSelector('[data-testid="rfq-create-form"]', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "04-rfq-create-screen.png"), fullPage: true });
  console.log("✓ 04-rfq-create-screen.png");

  // Category field close-up on RFQ create
  const category = page.locator('[data-testid="rfq-category"]').locator("..").locator("..");
  await category.screenshot({ path: path.join(OUT, "04b-rfq-category-field.png") });
  console.log("✓ 04b-rfq-category-field.png");

  // Line items as "basket" equivalent in current RFQ
  const lines = page.locator('[data-testid="rfq-line-0"]').locator("../..");
  await lines.screenshot({ path: path.join(OUT, "03b-rfq-line-items-basket.png") });
  console.log("✓ 03b-rfq-line-items-basket.png");

  await page.goto(`${BASE}/buyer/dashboard`);
  await page.waitForSelector('[data-testid="buyer-dashboard"]', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "05-buyer-dashboard-rfq-view.png"), fullPage: true });
  console.log("✓ 05-buyer-dashboard-rfq-view.png");

  await page.goto(`${BASE}/buyer/rfq`);
  await page.waitForSelector('[data-testid="rfq-list-page"]', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "02b-rfq-list-live-app.png"), fullPage: true });
  console.log("✓ 02b-rfq-list-live-app.png");

  await browser.close();
  console.log("\nDone — screenshots saved to faith/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
