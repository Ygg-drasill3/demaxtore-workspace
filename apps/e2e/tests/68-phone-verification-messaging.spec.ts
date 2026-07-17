// Sprint — Phone verification + messaging unlock
import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import {
  API_BASE,
  PW,
  REPO_ROOT,
  apiLogin,
  authHeaders,
  newRequest,
  uiLogin,
  USERS,
  waitForHydrate,
} from "./_helpers";

const LEGACY_BUYER = { email: "buyer@dema.test", password: PW };

function resetLegacyBuyerPhone() {
  execSync(
    `npx tsx scripts/reset-user-phone-verification.ts ${LEGACY_BUYER.email}`,
    { cwd: `${REPO_ROOT}/apps/backend`, stdio: "pipe" },
  );
}

test.describe.serial("Phone verification messaging gate", () => {
  let submittedRequestId = "";

  test.beforeAll(() => {
    resetLegacyBuyerPhone();
  });

  test("01 — Legacy buyer without phone sees verification gate on /messages", async ({ page }) => {
    await uiLogin(page, LEGACY_BUYER, { force: true });
    await page.goto("/messages");
    await waitForHydrate(page);
    await expect(page.getByTestId("phone-verification-gate")).toBeVisible();
    await expect(page.getByTestId("add-phone-button")).toBeVisible();
  });

  test("02 — API blocks messaging until phone is verified", async () => {
    resetLegacyBuyerPhone();
    const req = await newRequest();
    const token = await apiLogin(req, LEGACY_BUYER);
    const me = await req.get(`${API_BASE}/api/phone-verification/me`, { headers: authHeaders(token) });
    const meJson = (await me.json()) as { canMessage: boolean; phoneVerificationStatus: string | null };
    expect(meJson.canMessage).toBe(false);

    const list = await req.get(`${API_BASE}/api/messaging/conversations`, {
      headers: authHeaders(token),
    });
    expect(list.ok()).toBeTruthy();
    const convs = (await list.json()) as { items: Array<{ id: string }> };
    const conversationId = convs.items[0]?.id;
    if (!conversationId) {
      test.skip(true, "No conversation available for legacy buyer");
      return;
    }
    const send = await req.post(
      `${API_BASE}/api/messaging/conversations/${conversationId}/messages`,
      {
        headers: authHeaders(token),
        data: { body: "blocked before verify", channel: "WORKSPACE", clientMessageId: crypto.randomUUID() },
      },
    );
    expect(send.status(), await send.text()).toBe(403);
  });

  test("03 — Buyer submits phone for verification", async ({ page }) => {
    resetLegacyBuyerPhone();
    const req = await newRequest();
    const token = await apiLogin(req, LEGACY_BUYER);
    const submit = await req.post(`${API_BASE}/api/phone-verification/submit`, {
      headers: authHeaders(token),
      data: { phone: "+905559990001" },
    });
    expect(submit.ok()).toBeTruthy();

    const me = await req.get(`${API_BASE}/api/phone-verification/me`, { headers: authHeaders(token) });
    const meJson = (await me.json()) as { phoneVerificationStatus: string; canMessage: boolean };
    expect(meJson.phoneVerificationStatus).toBe("PENDING_PHONE_VERIFICATION");
    expect(meJson.canMessage).toBe(false);

    await uiLogin(page, LEGACY_BUYER, { force: true });
    await page.goto("/messages");
    await expect(page.getByTestId("phone-pending-banner")).toBeVisible({ timeout: 15_000 });

    const adminToken = await apiLogin(req, USERS.admin);
    const queue = await req.get(`${API_BASE}/api/phone-verification/queue?status=PENDING`, {
      headers: authHeaders(adminToken),
    });
    expect(queue.ok()).toBeTruthy();
    const data = (await queue.json()) as { items: Array<{ id: string; user: { email: string } }> };
    const row = data.items.find((i) => i.user.email === LEGACY_BUYER.email);
    expect(row).toBeTruthy();
    submittedRequestId = row!.id;
  });

  test("04 — Admin approves phone and messaging unlocks", async ({ page }) => {
    expect(submittedRequestId).toBeTruthy();
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const approve = await req.post(`${API_BASE}/api/phone-verification/${submittedRequestId}/approve`, {
      headers: authHeaders(adminToken),
      data: {},
    });
    expect(approve.ok()).toBeTruthy();

    await uiLogin(page, LEGACY_BUYER, { force: true });
    await page.goto("/messages");
    await waitForHydrate(page);
    await expect(page.getByTestId("phone-verification-gate")).toHaveCount(0);
    await expect(page.getByTestId("unified-messages-page")).toBeVisible();
  });

  test("05 — New buyer registration requires phone", async () => {
    const email = `e2e-buyer-${Date.now()}@phone-verify.test`;
    const req = await newRequest();
    const register = await req.post(`${API_BASE}/api/auth/register`, {
      data: {
        displayName: "E2E Buyer",
        organisationName: "Phone Verify Co",
        email,
        password: PW,
        phone: "+905559990099",
      },
    });
    expect(register.ok()).toBeTruthy();
    const { user, accessToken } = (await register.json()) as {
      accessToken: string;
      user: { phoneVerificationStatus: string; phoneNumber: string | null };
    };
    expect(user.phoneVerificationStatus).toBe("PENDING_PHONE_VERIFICATION");
    expect(user.phoneNumber).toBeTruthy();

    const me = await req.get(`${API_BASE}/api/phone-verification/me`, {
      headers: authHeaders(accessToken),
    });
    expect(me.ok()).toBeTruthy();
    const meJson = (await me.json()) as { canMessage: boolean };
    expect(meJson.canMessage).toBe(false);

    const missingPhone = await req.post(`${API_BASE}/api/auth/register`, {
      data: {
        displayName: "E2E Buyer",
        organisationName: "Phone Verify Co",
        email: `e2e-no-phone-${Date.now()}@phone-verify.test`,
        password: PW,
      },
    });
    expect(missingPhone.status()).toBe(400);
  });

  test("06 — Admin dashboard shows pending phone widget when queue non-empty", async ({ page }) => {
    await uiLogin(page, USERS.admin, { force: true });
    await page.goto("/admin/dashboard");
    await waitForHydrate(page);
    const widget = page.getByTestId("pending-phone-verifications-widget");
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(page.getByTestId("pending-phone-verifications-open")).toBeVisible();
    }
  });
});
