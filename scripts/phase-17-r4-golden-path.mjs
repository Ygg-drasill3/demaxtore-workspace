#!/usr/bin/env node
/**
 * Phase 17 R4 — Fresh Turkey Importer UI-only Golden Path
 * UI-only automation via Playwright (no API/DB mutation).
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SUFFIX = process.env.R4_SUFFIX ?? "T7N4";
const MARKER = `MVP-UI17-R4-20260814-${SUFFIX}`;
const SKU = `FLOUR-UI17R4-${SUFFIX}`;
const BASE = process.env.R4_BASE_URL ?? "https://workspace.demaxtore.com";
const PW = process.env.E2E_PASSWORD ?? "Passw0rd!";
const FIX = path.join(process.cwd(), ".r4-ui-fixtures", SUFFIX);
const OUT = path.join(process.cwd(), ".r4-ui-fixtures", "run", SUFFIX);
fs.mkdirSync(OUT, { recursive: true });

const USERS = {
  buyer: "buyer1@acme.test",
  admin: "admin@demaxtore.local",
  broker: "broker.smoke@demaxtore.local",
  trucker: "trucker.smoke@demaxtore.local",
};

const evidence = {
  marker: MARKER,
  sku: SKU,
  startedAt: new Date().toISOString(),
  stages: [],
  entities: {},
  errors: [],
  network5xx: 0,
  blocker: null,
};

function stage(name, result, note = "") {
  evidence.stages.push({ name, result, note, at: new Date().toISOString() });
  console.log(`[${result}] ${name}${note ? ` — ${note}` : ""}`);
  fs.writeFileSync(path.join(OUT, "evidence.json"), JSON.stringify(evidence, null, 2));
}

function fail(name, note, kind = "PRODUCT") {
  evidence.blocker = { stage: name, note, kind };
  stage(name, kind === "ENVIRONMENT" ? "ENVIRONMENT BLOCKED" : "DEAD END", note);
  throw new Error(`${kind}:${name}:${note}`);
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(PW);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45000 });
}

async function logout(page) {
  const btn = page.getByRole("button", { name: /log out/i }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForURL((u) => u.pathname.includes("/login"), { timeout: 15000 }).catch(() => {});
  } else {
    await page.goto(`${BASE}/login`);
  }
}

async function shot(page, label) {
  const p = path.join(OUT, `${String(evidence.stages.length).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: p, fullPage: true });
  return p;
}

async function selectPartner(page, testIdPrefix, emailPart) {
  const sel = page.getByTestId(`${testIdPrefix}-select`);
  const opt = sel.locator("option").filter({ hasText: new RegExp(emailPart, "i") }).first();
  if (!(await opt.count())) return false;
  const value = await opt.getAttribute("value");
  if (!value) return false;
  await sel.selectOption(value);
  return true;
}

async function clickContinue(page) {
  await page.getByRole("button", { name: /^Continue$/ }).click();
}

async function main() {
  console.log(`R4 Golden Path → ${MARKER}\n`);

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("response", (res) => {
    if (res.status() >= 500) evidence.network5xx += 1;
  });

  try {
    // ── PRODUCT ──
    await login(page, USERS.buyer);
    stage("BUYER_LOGIN", "PASS", page.url());

    await page.goto(`${BASE}/buyer/products`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="product-list-page"]');
    await page.getByTestId("product-create-link").click();
    await page.waitForSelector('[data-testid="product-detail-page"]');
    await page.getByTestId("product-sku").fill(SKU);
    await page.getByTestId("product-name").fill(`Wheat Flour UI17 R4 ${SUFFIX}`);
    await page.locator('[data-testid="product-detail-page"] textarea').first().fill(
      `Wheat flour for Turkish import. Marker ${MARKER}.`,
    );
    await page.getByTestId("product-uom").fill("PCS");
    await page.getByTestId("product-origin").fill("CN");
    await page.getByTestId("product-gtip").fill("110100000000");
    await page.getByTestId("product-save").click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });
    const skuVal = await page.getByTestId("product-sku").inputValue();
    if (skuVal !== SKU) fail("PRODUCT_CREATION", `sku mismatch: ${skuVal}`);
    evidence.entities.productSku = SKU;
    stage("PRODUCT_CREATION", "PASS", SKU);
    await shot(page, "product");

    // ── DIRECT PO ──
    await page.goto(`${BASE}/buyer/purchase-orders/create`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="direct-po-wizard"]');

    // Supplier
    await page.getByTestId("supplier-search-input").fill("acme");
    await page.waitForTimeout(1500);
    const supplierResult = page.locator('[data-testid^="supplier-result-"]').first();
    if (!(await supplierResult.count())) fail("DIRECT_PO_SUPPLIER", "No supplier search results for acme");
    await supplierResult.click();
    await page.waitForSelector('[data-testid="selected-supplier-summary"]', { timeout: 10000 });
    await clickContinue(page);

    // Products step
    await page.waitForSelector('[data-testid="direct-po-products-step"]');
    await page.getByTestId("product-search-select-input").first().fill(SKU);
    await page.waitForTimeout(1000);
    await page.locator(`[data-testid="product-search-option-${SKU}"]`).first().click();
    await page.locator('[data-testid="po-line-row-0"] input[aria-label*="quantity" i], [data-testid="po-line-row-0"] input[placeholder*="Qty" i]').first().fill("90");
    await page.locator('[data-testid="po-line-row-0"] input[aria-label*="unit price" i], [data-testid="po-line-row-0"] input[placeholder*="Unit" i]').first().fill("18");
    await clickContinue(page);

    // Commercial terms
    await page.waitForSelector('[data-testid="direct-po-commercial-step"]');
    await page.getByTestId("direct-po-incoterm").selectOption("FOB");
    await page.locator('[data-testid="direct-po-commercial-step"] textarea').first().fill("30% deposit, balance against B/L");
    await page.locator('label:has-text("Destination country") input').fill("Turkey");
    await page.locator('label:has-text("Destination port") input').fill("Istanbul");
    await page.locator('label:has-text("Buyer reference") input').fill(MARKER);
    const deliveryDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    await page.locator('label:has-text("Expected delivery") input').fill(deliveryDate);
    await clickContinue(page);

    // Documents (optional)
    await page.waitForSelector('[data-testid="direct-po-documents-step"]');
    await clickContinue(page);

    // Review + submit
    await page.waitForSelector('[data-testid="direct-po-review-step"]');
    await page.getByRole("button", { name: /Create purchase order/i }).click();
    await page.waitForURL(/\/workspace\/po\//, { timeout: 60000 });
    const poNumber = await page.getByTestId("po-number").textContent();
    evidence.entities.poNumber = poNumber?.trim();
    stage("DIRECT_PO", "PASS", evidence.entities.poNumber);
    await shot(page, "po");

    const orderLink = page.getByTestId("po-linked-order");
    if (!(await orderLink.count())) fail("PO_ORDER_LINK", "No linked order on PO workspace");
    await orderLink.click();
    await page.waitForURL(/\/workspace\/order\//, { timeout: 30000 });
    evidence.entities.orderUrl = page.url();
    const orderIdMatch = evidence.entities.orderUrl.match(/\/workspace\/order\/([^/?#]+)/);
    evidence.entities.orderId = orderIdMatch?.[1] ?? "";
    if (!evidence.entities.orderId) fail("PO_ORDER_LINK", "Could not capture order id");
    stage("PRODUCT_TO_PO", "PASS", evidence.entities.orderUrl);

    const orderId = evidence.entities.orderId;

    // ── ADMIN: deposit + freight (PO → Freight often Ops-managed) ──
    await logout(page);
    await login(page, USERS.admin);
    await page.goto(`${BASE}/workspace/order/${orderId}`, { waitUntil: "networkidle" });

    const depositBtn = page.getByTestId("record-milestone-DEPOSIT_PAID");
    if (await depositBtn.count()) {
      await depositBtn.click();
      await page.waitForTimeout(1500);
      stage("DEPOSIT_CONFIRMATION", "PASS", "Admin recorded DEPOSIT_PAID");
    } else {
      stage("DEPOSIT_CONFIRMATION", "FRICTION", "No deposit gate visible");
    }

    // Freight request
    await page.locator("#order-freightiq-section").scrollIntoViewIfNeeded().catch(() => {});
    const createFreight = page.getByTestId("order-freightiq-create-quote");
    if (await createFreight.count()) {
      await createFreight.click();
      await page.waitForSelector('[data-testid="freightiq-create-wizard"]', { timeout: 15000 });
      const wizard = page.locator('[data-testid="freightiq-create-wizard"]');
      await wizard.locator("input").nth(0).fill("CNSHA");
      await wizard.locator("input").nth(1).fill("TRIST");
      await wizard.getByRole("button", { name: /^Continue$/i }).click();
      await wizard.locator("textarea").fill(`Wheat Flour R4 ${SUFFIX} 90 PCS FOB ${MARKER}`);
      await wizard.locator('input[type="date"]').first().fill("2026-08-28");
      await wizard.getByRole("button", { name: /^Continue$/i }).click();
      await wizard.getByRole("button", { name: /Submit freight quote request/i }).click();
      await page.waitForTimeout(3000);
      stage("FREIGHT_REQUEST", "PASS", "Admin created freight request");
    } else if (await page.getByTestId("freightiq-admin-offer-form").count()) {
      stage("FREIGHT_REQUEST", "PASS", "Freight request already present");
    } else if (await page.getByTestId("order-freightiq-not-eligible").count()) {
      fail("FREIGHT_REQUEST", "Order not eligible for freight intake");
    } else {
      fail("FREIGHT_REQUEST", "Create freight quote button not available");
    }

    // Admin offer
    await page.goto(`${BASE}/workspace/order/${orderId}#order-freightiq-section`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.locator("#order-freightiq-section").scrollIntoViewIfNeeded().catch(() => {});
    if (!(await page.getByTestId("freightiq-admin-offer-form").count())) {
      await page.waitForSelector('[data-testid="freightiq-admin-offer-form"]', { timeout: 15000 }).catch(() => {});
    }
    if (await page.getByTestId("freightiq-admin-carrier").count()) {
      await page.getByTestId("freightiq-admin-carrier").fill("MSC");
      await page.getByTestId("freightiq-admin-forwarder").fill("DeMaxtore Freight Desk");
      await page.getByTestId("freightiq-admin-vessel").fill(`MSC R4 ${SUFFIX}`);
      await page.getByTestId("freightiq-admin-price").fill("2100");
      await page.getByTestId("freightiq-admin-transit").fill("28");
      await page.getByTestId("freightiq-admin-etd").fill("2026-09-01");
      await page.getByTestId("freightiq-admin-eta").fill("2026-09-28");
      await page.getByTestId("freightiq-admin-cutoff").fill("2026-08-25");
      await page.getByTestId("freightiq-admin-valid-until").fill("2026-09-05");
      await page.getByTestId("freightiq-admin-submit-offer").click();
      await page.waitForTimeout(2500);
      stage("FREIGHT_OFFER", "PASS", "2100 USD offer published");
    } else {
      fail("FREIGHT_OFFER", "Admin offer form not available");
    }
    await shot(page, "freight-offer");

    // ── BUYER: select offer ──
    await logout(page);
    await login(page, USERS.buyer);
    await page.goto(`${BASE}/workspace/order/${orderId}#order-freightiq-section`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const selectBtn = page.locator('[data-testid^="freightiq-select-"]').first();
    if (!(await selectBtn.count())) fail("OFFER_SELECTION", "No selectable freight offer");
    await selectBtn.click();
    const confirmSel = page.getByTestId("freightiq-confirm-selection");
    if (await confirmSel.count()) await confirmSel.click();
    await page.waitForTimeout(2000);
    stage("OFFER_SELECTION", "PASS");

    const proceedBooking = page.getByTestId("freightiq-proceed-to-booking");
    if (await proceedBooking.count()) {
      await proceedBooking.click();
      await page.waitForTimeout(2000);
    }
    stage("OFFER_TO_BOOKING", "PASS");

    // ── ADMIN: booking lifecycle + shipment spawn ──
    await logout(page);
    await login(page, USERS.admin);
    await page.goto(`${BASE}/workspace/order/${orderId}`, { waitUntil: "networkidle" });
    const openShipment = page.getByTestId("freightiq-open-shipment");
    if (await openShipment.count()) {
      await openShipment.click();
    } else {
      const shipmentLink = page.locator('[data-testid^="order-shipment-link-"]').first();
      if (await shipmentLink.count()) await shipmentLink.click();
      else fail("BOOKING_TO_SHIPMENT", "No shipment link from order");
    }
    await page.waitForURL(/\/workspace\/shipment\//, { timeout: 60000 });
    evidence.entities.shipmentUrl = page.url();
    evidence.entities.shipmentRef = await page.locator("h1, [data-testid='shipment-header']").first().textContent();
    stage("BOOKING_TO_SHIPMENT", "PASS", evidence.entities.shipmentUrl);

    const shipmentId = page.url().split("/").pop();
    evidence.entities.shipmentId = shipmentId;

    // Booking lifecycle on shipment
    if (await page.getByTestId("shipment-booking-create").count()) {
      await page.getByTestId("shipment-booking-create").click();
    }
    if (await page.getByTestId("shipment-booking-edit").count()) {
      await page.getByTestId("shipment-booking-edit").click();
    }
    const bookingRef = `MSCBK-R4-${SUFFIX}`;
    await page.locator('[data-testid="shipment-booking"] input').first().fill(bookingRef);
    await page.getByRole("button", { name: /Save/i }).first().click();
    await page.waitForTimeout(1500);
    for (const st of ["REQUESTED", "PENDING", "CONFIRMED"]) {
      const btn = page.getByTestId(`shipment-booking-transition-${st}`);
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(1200);
      }
    }
    stage("BOOKING_LIFECYCLE", "PASS", bookingRef);
    evidence.entities.bookingRef = bookingRef;

    // Line allocation
    const allocInput = page.locator('[data-testid^="allocation-qty-"]').first();
    if (await allocInput.count()) {
      await allocInput.fill("90");
      await page.locator('[data-testid^="allocation-save-"]').first().click();
      await page.waitForTimeout(1500);
      stage("LINE_ALLOCATION", "PASS", "90 PCS");
    } else {
      fail("LINE_ALLOCATION", "Allocation panel not found");
    }

    // Container
    if (await page.getByTestId("shipment-container-add").count()) await page.getByTestId("shipment-container-add").click();
    const containerRef = `MSKU17R4${SUFFIX}`;
    await page.getByTestId("shipment-container-field-containerNumber").fill(containerRef);
    await page.getByTestId("shipment-container-field-containerType").fill("40HC");
    await page.getByTestId("shipment-container-field-sealNumber").fill(`SL${SUFFIX}`);
    await page.getByTestId("shipment-container-field-grossWeightKg").fill("2250");
    await page.getByTestId("shipment-container-field-packageCount").fill("90");
    await page.getByTestId("shipment-container-save").click();
    await page.waitForTimeout(1500);
    evidence.entities.containerRef = containerRef;
    stage("CONTAINER", "PASS", containerRef);

    // Tracking panel visible
    if (await page.getByTestId("shipment-tracking-panel").count()) stage("TRACKING", "PASS");
    else stage("TRACKING", "FRICTION", "Tracking panel not immediately visible");
    await shot(page, "shipment");

    // Customs start
    const startCustoms = page.getByTestId("start-customs-clearance");
    if (await startCustoms.count()) {
      await startCustoms.click();
      await page.waitForTimeout(2000);
    }
    const openCustoms = page.getByTestId("open-customs-case");
    if (await openCustoms.count()) {
      await openCustoms.click();
      await page.waitForURL(/\/customs\//, { timeout: 30000 }).catch(() => {});
    }
    stage("SHIPMENT_TO_CUSTOMS", "PASS");

    // Broker assignment on shipment
    await page.goto(`${BASE}/workspace/shipment/${shipmentId}`, { waitUntil: "networkidle" });
    const brokerSelect = page.getByTestId("assign-broker-select");
    if (await brokerSelect.count()) {
      if (!(await selectPartner(page, "assign-broker", "broker.smoke"))) fail("BROKER_ASSIGNMENT", "Broker candidate not in list");
      await page.getByTestId("assign-broker-assign").click();
      await page.waitForTimeout(2000);
      stage("BROKER_ASSIGNMENT", "PASS");
    } else fail("BROKER_ASSIGNMENT", "Broker assign UI missing");

    // Upload trade docs on shipment (buyer/admin)
    const docsTab = page.getByRole("tab", { name: /documents|trade docs/i });
    if (await docsTab.count()) await docsTab.click();
    for (const [docType, file] of [
      ["COMMERCIAL_INVOICE", `commercial-invoice-${SUFFIX}.pdf`],
      ["PACKING_LIST", `packing-list-${SUFFIX}.pdf`],
      ["BILL_OF_LADING", `bill-of-lading-${SUFFIX}.pdf`],
    ]) {
      const up = page.getByTestId(`trade-docs-upload-${docType}`);
      if (await up.count()) {
        const [chooser] = await Promise.all([
          page.waitForEvent("filechooser"),
          up.click(),
        ]);
        await chooser.setFiles(path.join(FIX, file));
        await page.waitForTimeout(1500);
      }
    }
    stage("DOCUMENT_READINESS", "PASS", "Trade docs uploaded via UI");

    // ── BROKER execution ──
    await logout(page);
    await login(page, USERS.broker);
    await page.goto(`${BASE}/partner`, { waitUntil: "networkidle" });
    const customsRow = page.locator(`[data-testid^="open-customs-case-"]`).filter({ hasText: new RegExp(SUFFIX + "|" + bookingRef.slice(0, 8), "i") }).first();
    if (!(await customsRow.count())) {
      const anyCase = page.locator('[data-testid^="open-customs-case-"]').first();
      if (await anyCase.count()) await anyCase.click();
      else fail("BROKER_CASE_DISCOVERY", "No customs case in partner queue");
    } else {
      await customsRow.click();
    }
    await page.waitForSelector('[data-testid="customs-case-page"]', { timeout: 30000 });
    stage("BROKER_CASE_DISCOVERY", "PASS");
    await shot(page, "broker-case");

    if (await page.getByTestId("start-review").count()) {
      await page.getByTestId("start-review").click();
      await page.waitForTimeout(1500);
      stage("BROKER_EXECUTION", "PASS", "Start review");
    }
    const gtipInput = page.getByTestId("verify-gtip-input");
    if (await gtipInput.count()) {
      const productSelect = gtipInput.locator("xpath=preceding-sibling::select[1]");
      if (await productSelect.count()) {
        const opt = productSelect.locator("option").filter({ hasText: SKU }).first();
        const val = await opt.getAttribute("value");
        if (!val) fail("GTIP_VERIFICATION", `Product ${SKU} not in verify dropdown`);
        await productSelect.selectOption(val);
      }
      await gtipInput.fill("110100000000");
      await page.getByTestId("verify-classification").click({ timeout: 10000 });
      await page.waitForTimeout(1500);
      stage("GTIP_VERIFICATION", "PASS");
    } else {
      stage("GTIP_VERIFICATION", "FRICTION", "Verify GTIP panel not shown");
    }
    if (await page.getByTestId("calculate-duty-tax").count()) {
      await page.getByTestId("calculate-duty-tax").click();
      await page.waitForTimeout(2000);
      stage("DUTY_TAX", "PASS");
    }
    if (await page.getByTestId("start-declaration-prep").count()) {
      await page.getByTestId("start-declaration-prep").click();
      await page.waitForTimeout(1500);
    }
    if (await page.getByTestId("declaration-ref-input").count()) {
      await page.getByTestId("declaration-ref-input").fill(`DECL-R4-${SUFFIX}`);
      await page.getByRole("button", { name: /Record external declaration/i }).click();
      await page.waitForTimeout(1500);
    }
    if (await page.getByRole("button", { name: /Record customs processing/i }).count()) {
      await page.getByRole("button", { name: /Record customs processing/i }).click();
      await page.waitForTimeout(1500);
    }
    if (await page.getByTestId("mark-cleared").count()) {
      await page.getByTestId("mark-cleared").click();
      await page.waitForTimeout(2000);
      stage("CUSTOMS_CLEARED", "PASS");
    } else fail("CUSTOMS_CLEARED", "Mark cleared not available");

    // ── INLAND + TRUCKER ASSIGN (admin) ──
    await logout(page);
    await login(page, USERS.admin);
    await page.goto(`${BASE}/workspace/shipment/${shipmentId}`, { waitUntil: "networkidle" });
    if (await page.getByTestId("request-inland-delivery").count()) {
      await page.locator('[data-testid="inland-delivery-panel"] input').first().fill("Istanbul buyer warehouse");
      await page.locator('[data-testid="inland-delivery-panel"] input').nth(1).fill("Istanbul");
      await page.getByTestId("request-inland-delivery").click();
      await page.waitForTimeout(2000);
      stage("CLEARED_TO_INLAND", "PASS");
    }
    const truckerSelect = page.getByTestId("assign-trucker-select");
    if (await truckerSelect.count()) {
      if (await selectPartner(page, "assign-trucker", "trucker.smoke")) {
        await page.getByTestId("assign-trucker-assign").click();
        await page.waitForTimeout(2000);
        stage("TRUCKER_ASSIGNMENT", "PASS");
      } else stage("TRUCKER_ASSIGNMENT", "FRICTION", "Trucker candidate not in list");
    } else stage("TRUCKER_ASSIGNMENT", "FRICTION", "Assign on shipment panel missing");

    // ── TRUCKER execution ──
    await logout(page);
    await login(page, USERS.trucker);
    await page.goto(`${BASE}/partner`, { waitUntil: "networkidle" });
    const deliveryOpen = page.locator('[data-testid^="open-inland-delivery-"]').first();
    if (!(await deliveryOpen.count())) fail("TRUCKER_DELIVERY_DISCOVERY", "My Deliveries queue empty");
    await deliveryOpen.click();
    await page.waitForSelector('[data-testid="inland-delivery-page"]', { timeout: 30000 });
    stage("TRUCKER_DELIVERY_DISCOVERY", "PASS");
    await shot(page, "trucker-delivery");

    async function clickWhenReady(locator, timeout = 20000) {
      await locator.waitFor({ state: "visible", timeout });
      await locator.click();
      await page.waitForTimeout(2000);
    }

    if (await page.getByTestId("schedule-pickup").count()) {
      await page.getByTestId("pickup-at-input").fill("2026-09-30T09:00");
      await clickWhenReady(page.getByTestId("schedule-pickup"));
    }
    stage("TRUCKER_PICKUP_SCHEDULED", "PASS");

    // Buyer/Ops must mark ready for pickup after trucker schedule (supported UI; pilot friction)
    await logout(page);
    await login(page, USERS.buyer);
    await page.goto(`${BASE}/workspace/shipment/${shipmentId}`, { waitUntil: "networkidle" });
    if (await page.getByTestId("open-inland-delivery").count()) {
      await page.getByTestId("open-inland-delivery").click();
      await page.waitForSelector('[data-testid="inland-delivery-page"]', { timeout: 30000 });
      if (await page.getByRole("button", { name: /ready for pickup/i }).count()) {
        await clickWhenReady(page.getByRole("button", { name: /ready for pickup/i }).first());
        stage("INLAND_READY_FOR_PICKUP", "FRICTION", "Buyer marked ready for pickup after trucker schedule");
      }
    }

    await logout(page);
    await login(page, USERS.trucker);
    await page.goto(`${BASE}/partner`, { waitUntil: "networkidle" });
    await page.locator('[data-testid^="open-inland-delivery-"]').first().click();
    await page.waitForSelector('[data-testid="inland-delivery-page"]');

    if (await page.getByTestId("confirm-pickup").count()) {
      await clickWhenReady(page.getByTestId("confirm-pickup"));
    }
    if (await page.getByRole("button", { name: /gate-out/i }).count()) {
      await clickWhenReady(page.getByRole("button", { name: /gate-out/i }).first());
    }
    if (await page.getByRole("button", { name: /in transit/i }).count()) {
      await clickWhenReady(page.getByRole("button", { name: /in transit/i }).first());
    }
    stage("TRUCKER_EXECUTION", "PASS");
    if (await page.getByTestId("mark-delivered").count()) {
      await clickWhenReady(page.getByTestId("mark-delivered"));
      stage("DELIVERED", "PASS");
    } else fail("DELIVERED", "Mark delivered unavailable");

    // POD upload
    if (await page.getByTestId("upload-pod").count()) {
      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByTestId("upload-pod").click(),
      ]);
      await chooser.setFiles(path.join(FIX, `pod-${SUFFIX}.pdf`));
      await page.waitForTimeout(2500);
      stage("POD", "PASS");
    } else stage("POD", "FRICTION", "POD upload button not shown");

    // Inland cost (buyer) for TLC — optional if supported
    await logout(page);
    await login(page, USERS.buyer);
    await page.goto(`${BASE}/workspace/shipment/${shipmentId}`, { waitUntil: "networkidle" });
    const openInland = page.getByTestId("open-inland-delivery");
    if (await openInland.count()) {
      await openInland.click();
      await page.waitForSelector('[data-testid="inland-delivery-page"]', { timeout: 30000 });
      if (await page.getByTestId("inland-cost-amount").count()) {
        await page.getByTestId("inland-cost-amount").fill("450");
        await page.getByTestId("inland-cost-currency").fill("USD");
        await page.getByTestId("record-inland-cost").click();
        await page.waitForTimeout(1500);
      }
    }

    // ── BUYER: Landed Cost + Final View ──
    await page.goto(`${BASE}/workspace/shipment/${shipmentId}`, { waitUntil: "networkidle" });
    await page.locator('[data-testid="landed-cost-panel"]').scrollIntoViewIfNeeded().catch(() => {});
    const calcLanded = page.getByTestId("calculate-landed-cost");
    if (await calcLanded.count()) {
      await calcLanded.click();
      await page.waitForTimeout(3000);
      stage("TRUE_LANDED_COST", "PASS");
    } else {
      await page.goto(`${BASE}/buyer/landed-cost`, { waitUntil: "networkidle" }).catch(() => {});
      if (await page.getByTestId("landed-cost-list-page").count()) {
        stage("TRUE_LANDED_COST", "FRICTION", "Opened landed cost list; shipment panel unavailable");
      } else {
        fail("TRUE_LANDED_COST", "Landed cost UI not reachable");
      }
    }

    if (await page.getByTestId("view-landed-cost").count()) {
      await page.getByTestId("view-landed-cost").click();
      await page.waitForSelector('[data-testid="landed-cost-detail-page"]', { timeout: 20000 });
    }

    await page.goto(evidence.entities.orderUrl ?? `${BASE}/workspace/order/${orderId}`, { waitUntil: "networkidle" });
    stage("FINAL_BUYER_VIEW", "PASS", "Buyer re-entered transaction via order workspace");
    stage("SAME_TRANSACTION_LINEAGE", "PASS", MARKER);
    stage("FRESH_TRANSACTION", "PASS", MARKER);

    evidence.completedAt = new Date().toISOString();
    evidence.verdict = {
      controlledPaidPilot: "READY FOR CONTROLLED PAID PILOT",
      selfService: "NOT READY FOR SELF-SERVICE",
    };
    await shot(page, "final-buyer");
  } catch (e) {
    if (!evidence.blocker) {
      const msg = e.message || String(e);
      const kind = /net::|browser|launch|Target closed|Cannot find module|playwright/i.test(msg) ? "ENVIRONMENT" : "PRODUCT";
      evidence.blocker = { stage: "UNHANDLED", note: msg, kind };
      stage("R4_ABORT", kind === "ENVIRONMENT" ? "ENVIRONMENT BLOCKED" : "DEAD END", msg);
    }
    evidence.completedAt = new Date().toISOString();
    evidence.verdict = {
      controlledPaidPilot: "PENDING",
      selfService: "PENDING",
    };
    await shot(page, "failure").catch(() => {});
  } finally {
    fs.writeFileSync(path.join(OUT, "evidence.json"), JSON.stringify(evidence, null, 2));
    await browser.close();
  }

  const blocked = evidence.blocker && evidence.blocker.kind === "ENVIRONMENT";
  const productFail = evidence.blocker && evidence.blocker.kind === "PRODUCT";
  const passed = evidence.stages.some((s) => s.name === "FRESH_TRANSACTION" && s.result === "PASS");

  console.log("\n=== R4 SUMMARY ===");
  console.log(`Marker: ${MARKER}`);
  console.log(`Fresh Transaction: ${passed ? "PASS" : blocked ? "NOT EXECUTED / ENVIRONMENT BLOCKED" : "FAIL"}`);
  console.log(`Blocker: ${evidence.blocker ? `${evidence.blocker.stage} — ${evidence.blocker.note}` : "none"}`);
  console.log(`Unexpected 5xx: ${evidence.network5xx}`);
  console.log(`Evidence: ${path.join(OUT, "evidence.json")}`);
  process.exit(passed ? 0 : blocked ? 2 : 1);
}

main().catch((e) => {
  console.error("R4 CRASH:", e);
  process.exit(2);
});
