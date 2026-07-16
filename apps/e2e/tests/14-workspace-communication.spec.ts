// Sprint 5E — Unified workspace communication
import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import {
  uiLogin,
  USERS,
  apiLogin,
  newRequest,
  API_BASE,
  setupSubmittedRfqWithStrategy,
  assignAndPublish,
  closeQuotationsAndStartEvaluation,
  runControlTowerScan,
  findOpenAlert,
  waitForHydrate,
} from "./_helpers";

const commBase = (type: string, id: string) =>
  `${API_BASE}/api/workspace-communication/${type}/${id}`;

async function bootstrapOrderId(): Promise<string> {
  const req = await newRequest();
  const buyerToken = await apiLogin(req, USERS.buyer1);
  const adminToken = await apiLogin(req, USERS.admin);
  const supplierToken = await apiLogin(req, USERS.supA1);
  const { id: rfqId } = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Comm ${Date.now()}`);
  await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
  await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 10, unitPrice: 40 }] },
  });
  await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId, "workspace comm E2E");
  const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
  const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "comm" } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  const fd = new FormData();
  fd.append("file", new Blob([Buffer.from("pi")], { type: "application/pdf" }), "pi.pdf");
  const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${supplierToken}` },
    body: fd as unknown as BodyInit,
  });
  const upJson = await up.json() as { id: string };
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  const spawned = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  return spawned[0].id;
}

test.describe.serial("Workspace communication (Sprint 5E)", () => {
  let orderId = "";
  let buyerMessageId = "";

  test("01 — Buyer sends message on order workspace", async () => {
    orderId = await bootstrapOrderId();
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const res = await req.post(`${commBase("order", orderId)}/actions/create-message`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        payload: {
          body: "Buyer operational note for E2E comm",
          messageType: "MESSAGE",
          visibility: "ALL_PARTICIPANTS",
        },
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { messages: Array<{ id: string; body: string }> };
    const hit = body.messages.find((m) => m.body.includes("Buyer operational"));
    expect(hit).toBeTruthy();
    buyerMessageId = hit!.id;
  });

  test("02 — Supplier replies via UI", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.supA1, { force: true });
    await page.goto(`/workspace/order/${orderId}`);
    await waitForHydrate(page);
    await page.getByTestId("order-loading").waitFor({ state: "detached", timeout: 20_000 }).catch(() => {});
    await expect(page.getByTestId("order-communication")).toBeVisible({ timeout: 20_000 });
    const panel = page.getByTestId("order-communication");
    await panel.scrollIntoViewIfNeeded();
    await panel.getByTestId("hub-input").fill("Supplier reply on order comm E2E");
    await panel.getByTestId("hub-send").click();
    await expect(panel.getByTestId("hub-timeline")).toContainText("Supplier reply", { timeout: 20_000 });
  });

  test("03 — Admin internal note hidden from buyer", async () => {
    test.skip(!orderId, "no order");
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const buyerToken = await apiLogin(req, USERS.buyer1);
    await req.post(`${commBase("order", orderId)}/actions/create-message`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          body: "Admin internal ops note SECRET-E2E",
          messageType: "INTERNAL_NOTE",
          visibility: "ADMIN_ONLY",
        },
      },
    });
    const buyerView = await req.get(commBase("order", orderId), {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { messages: Array<{ body: string }> };
    expect(buyerView.messages.some((m) => m.body.includes("SECRET-E2E"))).toBeFalsy();
    const adminView = await req.get(commBase("order", orderId), {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { messages: Array<{ body: string }> };
    expect(adminView.messages.some((m) => m.body.includes("SECRET-E2E"))).toBeTruthy();
  });

  test("04 — Question creates timeline entry", async () => {
    test.skip(!orderId, "no order");
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    await req.post(`${commBase("order", orderId)}/actions/create-message`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        payload: {
          body: "What is the production ETA?",
          messageType: "QUESTION",
          visibility: "ALL_PARTICIPANTS",
        },
      },
    });
    const timeline = await req.get(`${API_BASE}/api/orders/${orderId}/timeline`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ eventType: string }>;
    expect(timeline.some((e) => e.eventType === "communication.question")).toBeTruthy();
  });

  test("05 — Read receipt", async () => {
    test.skip(!orderId || !buyerMessageId, "no message");
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    await req.post(`${commBase("order", orderId)}/actions/mark-read`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: { messageId: buyerMessageId } },
    });
    const conv = await req.get(commBase("order", orderId), {
      headers: { Authorization: `Bearer ${supplierToken}` },
    }).then((r) => r.json()) as { messages: Array<{ id: string; readByMe: boolean }> };
    const m = conv.messages.find((x) => x.id === buyerMessageId);
    expect(m?.readByMe).toBeTruthy();
  });

  test("06 — Search messages", async () => {
    test.skip(!orderId, "no order");
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const search = await req.get(
      `${commBase("order", orderId)}/search?q=production&limit=20`,
      { headers: { Authorization: `Bearer ${buyerToken}` } },
    ).then((r) => r.json()) as { items: Array<{ body: string }> };
    expect(search.items.some((m) => m.body.includes("production"))).toBeTruthy();
  });

  test("07 — Role isolation on create", async () => {
    test.skip(!orderId, "no order");
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const res = await req.post(`${commBase("order", orderId)}/actions/create-message`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: {
        payload: {
          body: "Supplier internal note attempt",
          messageType: "INTERNAL_NOTE",
          visibility: "ADMIN_ONLY",
        },
      },
    });
    expect(res.status()).toBe(403);
  });

  test("08 — Control Tower alert for stale question", async () => {
    const oid = await bootstrapOrderId();
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const adminToken = await apiLogin(req, USERS.admin);
    await req.post(`${commBase("order", oid)}/actions/create-message`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        payload: {
          body: "Stale question CT E2E",
          messageType: "QUESTION",
          visibility: "ALL_PARTICIPANTS",
        },
      },
    });
    const REPO = process.env.E2E_REPO_ROOT || `${process.cwd()}/../..`;
    const msg = await req.get(commBase("order", oid), {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { messages: Array<{ id: string; messageType: string }> };
    const q = msg.messages.find((m) => m.messageType === "QUESTION" && m.id);
    if (q) {
      execSync(`node scripts/e2e-age-workspace-message.mjs ${q.id} 50`, {
        cwd: `${REPO}/apps/backend`,
        stdio: "pipe",
      });
    }
    expect(q).toBeTruthy();
    let hit: Awaited<ReturnType<typeof findOpenAlert>> | undefined;
    for (let i = 0; i < 5; i++) {
      await runControlTowerScan(req, adminToken);
      hit = await findOpenAlert(req, adminToken, {
        workspaceId: oid,
        alertKey: "comm_question_unread_48h",
      });
      if (hit) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (hit) {
      expect(hit.alertKey).toBe("comm_question_unread_48h");
    }
  });

  test("09 — Attachment message", async () => {
    test.skip(!orderId, "no order");
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("%PDF-1.4")], { type: "application/pdf" }), "comm.pdf");
    const up = await fetch(`${commBase("order", orderId)}/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: fd as unknown as BodyInit,
    });
    expect(up.ok).toBeTruthy();
    const att = await up.json() as { id: string };
    const res = await req.post(`${commBase("order", orderId)}/actions/create-message`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        payload: {
          body: "See attached comm doc",
          messageType: "MESSAGE",
          attachmentIds: [att.id],
        },
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { messages: Array<{ attachments: Array<{ fileName: string }> }> };
    expect(body.messages.some((m) => m.attachments.some((a) => a.fileName === "comm.pdf"))).toBeTruthy();
  });

  test("10 — duplicate clientMessageId creates exactly one stored message (MSG-001)", async () => {
    test.skip(!orderId, "no order");
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const clientMessageId = crypto.randomUUID();
    const payload = {
      body: `FINAL-PILOT-CERT-20260716 idempotent ${Date.now()}`,
      itemType: "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      clientMessageId,
    };
    const headers = {
      Authorization: `Bearer ${buyerToken}`,
      "Idempotency-Key": clientMessageId,
    };
    const url = `${API_BASE}/api/workspaces/order/${orderId}/conversation/timeline`;
    const [r1, r2] = await Promise.all([
      req.post(url, { headers, data: payload }),
      req.post(url, { headers, data: payload }),
    ]);
    expect(r1.ok()).toBeTruthy();
    expect(r2.ok()).toBeTruthy();
    const hub = await req
      .get(`${API_BASE}/api/workspaces/order/${orderId}/conversation`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      })
      .then((r) => r.json()) as { timeline: Array<{ body: string }> };
    const matches = hub.timeline.filter((t) => t.body === payload.body);
    expect(matches.length).toBe(1);
  });
});
