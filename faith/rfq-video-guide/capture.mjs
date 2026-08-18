#!/usr/bin/env node
/**
 * RFQ video guide screenshots — "How RFQ Works"
 * Run: cd apps/e2e && node ../../faith/rfq-video-guide/capture.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE = process.env.E2E_FRONTEND_URL || "http://localhost:3000";
const PW = "Passw0rd!";

async function shot(page, name, opts = {}) {
  const dest = path.join(OUT, name);
  await page.screenshot({ path: dest, type: "png", ...opts });
  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`✓ ${name} (${kb} KB)`);
}

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(1200);
  if (!page.url().includes("/login")) return;
  await page.getByTestId("login-email").fill("buyer1@acme.test");
  await page.getByTestId("login-password").fill(PW);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 20000 });
  await page.waitForTimeout(800);
}

async function fillRfqForm(page, title) {
  const deadline = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 16);
  await page.getByTestId("rfq-title").fill(title);
  await page.getByTestId("rfq-category").fill("Grains & Rice");
  await page.getByTestId("rfq-market").fill("Germany");
  await page.getByTestId("rfq-description").fill(
    "Premium basmati rice import — 20ft container equivalent. Need FOB pricing with BRC certification.",
  );
  await page.getByTestId("rfq-incoterm").selectOption("FOB");
  await page.getByTestId("rfq-currency").selectOption("USD");
  await page.getByTestId("rfq-deadline").fill(deadline);
  await page.locator('[data-testid="rfq-line-0"] input').first().fill("Premium Basmati Rice 5kg");
  await page.locator('[data-testid="rfq-line-0"] input').nth(1).fill("500");
  await page.locator('[data-testid="rfq-line-0"] input').nth(2).fill("BAGS");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  await login(page);

  // 01 — Learning Center overview
  await page.goto(`${BASE}/learning`);
  await page.waitForSelector('[data-testid="learning-center-page"]', { timeout: 20000 });
  await page.waitForTimeout(1000);
  await shot(page, "01-learning-center-overview.png", { fullPage: true });

  // 02 — How RFQ Works card (close-up)
  const rfqCard = page.getByTestId("learning-card-rfq");
  await rfqCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await rfqCard.screenshot({ path: path.join(OUT, "02-how-rfq-works-guide-card.png"), type: "png" });
  console.log("✓ 02-how-rfq-works-guide-card.png");

  // 03 — Buyer dashboard + New RFQ CTA
  await page.goto(`${BASE}/buyer/dashboard`);
  await page.waitForSelector('[data-testid="buyer-dashboard"]', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await shot(page, "03-buyer-dashboard-new-rfq.png", { fullPage: false });

  // 04 — Empty RFQ create form
  await page.goto(`${BASE}/buyer/rfq/new`);
  await page.waitForSelector('[data-testid="rfq-create-form"]', { timeout: 20000 });
  await page.waitForTimeout(600);
  await shot(page, "04-rfq-create-form-empty.png", { fullPage: true });

  // 05 — Partially filled (draft in progress)
  await page.getByTestId("rfq-title").fill("Basmati Rice Import — Q3 2026");
  await page.getByTestId("rfq-category").fill("Grains & Rice");
  await page.getByTestId("rfq-market").fill("Germany");
  await page.waitForTimeout(300);
  await shot(page, "05-rfq-create-draft-in-progress.png", { fullPage: true });

  // 06 — Full form with line items
  const ts = Date.now();
  const title = `Video Guide RFQ ${ts}`;
  await fillRfqForm(page, title);
  await page.waitForTimeout(400);
  await shot(page, "06-rfq-create-with-line-items.png", { fullPage: true });

  // 07 — Line items section focus
  const lineSection = page.locator('[data-testid="rfq-line-0"]').locator("xpath=ancestor::section[1]");
  await lineSection.scrollIntoViewIfNeeded();
  await lineSection.screenshot({ path: path.join(OUT, "07-rfq-line-items-detail.png"), type: "png" });
  console.log("✓ 07-rfq-line-items-detail.png");

  // 08 — Submit RFQ → procurement strategy
  await page.getByTestId("rfq-submit").click();
  await page.waitForURL(/\/procurement-strategy/, { timeout: 20000 });
  await page.waitForSelector('[data-testid="procurement-strategy-page"]', { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, "08-procurement-strategy-choice.png", { fullPage: true });

  // 09 — Direct RFQ selected
  await page.getByTestId("procurement-direct-rfq").click();
  await page.waitForTimeout(500);
  await shot(page, "09-direct-rfq-confirm.png", { fullPage: true });

  // 10 — Back to strategy, CommodityBid selected
  await page.getByRole("button", { name: "Back" }).click();
  await page.waitForTimeout(400);
  await page.getByTestId("procurement-commoditybid-auction").click();
  await page.waitForTimeout(800);
  await shot(page, "10-commoditybid-auction-setup.png", { fullPage: true });

  // 11 — Strategy cards side-by-side (fresh RFQ via save draft for clean state)
  await page.goto(`${BASE}/buyer/rfq/new`);
  await page.waitForSelector('[data-testid="rfq-create-form"]', { timeout: 15000 });
  await fillRfqForm(page, `Strategy Demo RFQ ${ts}`);
  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.waitForURL(/\/procurement-strategy/, { timeout: 20000 });
  await page.waitForSelector('[data-testid="procurement-strategy-page"]', { timeout: 15000 });
  await page.waitForTimeout(600);
  await shot(page, "11-procurement-strategy-both-options.png", { fullPage: true });

  // 12 — RFQ list (context)
  await page.goto(`${BASE}/buyer/rfq`);
  await page.waitForSelector('[data-testid="rfq-list-page"]', { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, "12-rfq-list.png", { fullPage: true });

  await browser.close();
  console.log(`\nDone — ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
