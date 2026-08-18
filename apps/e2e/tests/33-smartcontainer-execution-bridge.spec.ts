// Sprint 12E — SmartContainer execution bridge E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("SmartContainer execution bridge (Sprint 12E)", () => {
  let containerId = "";
  let masterOrderRef = "";
  let supplierOrderId = "";
  let buyerToken = "";
  let adminToken = "";
  let supplierToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
    supplierToken = await apiLogin(req, { email: "supplier1@acme-mfg.test", password: "Passw0rd!" });
  });

  test("01 — Bootstrap container to MC_EXECUTION_READY", async () => {
    const req = await newRequest();
    const create = await req.post(`${API_BASE}/api/mixed-containers`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { containerType: "CONTAINER_40FT", currency: "USD" },
    });
    const mc = await create.json();
    containerId = mc.id;

    const catalog = await req.get(`${API_BASE}/api/mixed-container/catalog/products?category=pulses&limit=10`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const products = (await catalog.json()).items as Array<{
      id: string;
      productRef: string;
      moqPallets: number;
      packagingOptions: Array<{ id: string; moqPallets: number }>;
    }>;
    const product = products.find((p) => p.productRef === "MC-PUL-RL") ?? products[0];
    const packaging = product.packagingOptions[0];
    const lineRes = await req.post(`${API_BASE}/api/mixed-containers/${containerId}/lines`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        catalogProductId: product.id,
        packagingId: packaging.id,
        palletCount: packaging.moqPallets ?? product.moqPallets ?? 1,
      },
    });
    expect(lineRes.ok()).toBeTruthy();
    await req.post(`${API_BASE}/api/mixed-containers/${containerId}/actions/request-pricing`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });

    await req.post(`${API_BASE}/api/admin/mixed-containers/${containerId}/actions/start-procurement`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const mcDetail = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { lines: Array<{ id: string }> };
    const lineId = mcDetail.lines[0].id;
    await req.post(`${API_BASE}/api/admin/mixed-containers/${containerId}/procurement-quotes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { containerLineId: lineId, supplierCode: "SUP-001", exwPrice: 1000, currency: "USD" },
    });
    const offerRes = await req.post(`${API_BASE}/api/admin/mixed-containers/${containerId}/offers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { exportExecutionFee: 500, estimatedFreight: 1200 },
    });
    expect(offerRes.ok()).toBeTruthy();
    const offerData = await offerRes.json() as { offers: Array<{ id: string; status: string }> };
    const draftOffer = offerData.offers.find((o) => o.status === "DRAFT");
    expect(draftOffer).toBeTruthy();
    const sendRes = await req.post(`${API_BASE}/api/admin/mixed-containers/${containerId}/offers/${draftOffer!.id}/send`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(sendRes.ok()).toBeTruthy();

    const mc2 = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { activeOfferId: string };
    const approveRes = await req.post(`${API_BASE}/api/mixed-containers/offers/${mc2.activeOfferId}/actions/approve`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(approveRes.ok()).toBeTruthy();

    const alloc = await req.post(`${API_BASE}/api/admin/mixed-containers/allocations/${containerId}/allocations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { containerLineId: lineId, supplierCode: "SUP-001", allocatedPallets: packaging.moqPallets ?? product.moqPallets ?? 1, expectedExwPrice: 1000 },
    });
    expect(alloc.ok()).toBeTruthy();
    const allocData = await alloc.json() as { allocations: Array<{ id: string }> };
    const allocationId = allocData.allocations[0].id;
    const now = new Date();
    await req.post(`${API_BASE}/api/admin/mixed-containers/allocations/${containerId}/allocations/${allocationId}/proformas`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        proformaNumber: "PF-12E-001",
        issueDate: now.toISOString(),
        dueDate: new Date(now.getTime() + 14 * 86400000).toISOString(),
        currency: "USD",
        amount: 1000,
        documentUrl: "https://example.com/pf-12e.pdf",
      },
    });

    const coord = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/coordination`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { payments: Array<{ id: string }> };
    await req.patch(`${API_BASE}/api/mixed-containers/${containerId}/payments/${coord.payments[0].id}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { paymentStatus: "PAYMENT_SENT" },
    });
    await req.patch(`${API_BASE}/api/admin/mixed-containers/allocations/${containerId}/payments/${coord.payments[0].id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { paymentStatus: "PAYMENT_CONFIRMED" },
    });

    const ws = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { state: string };
    expect(ws.state).toBe("MC_EXECUTION_READY");
  });

  test("02 — Spawn master and supplier orders", async () => {
    const req = await newRequest();
    const spawn = await req.post(`${API_BASE}/api/admin/mixed-containers/${containerId}/actions/spawn-execution-orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(spawn.ok()).toBeTruthy();
    const result = await spawn.json();
    expect(result.masterOrderRef).toMatch(/^SC-\d{4}-\d{5}$/);
    expect(result.supplierOrders.length).toBeGreaterThan(0);
    masterOrderRef = result.masterOrderRef;
    supplierOrderId = result.supplierOrders[0].orderId;
    expect(result.state).toBe("MC_EXECUTION_ACTIVE");

    const links = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/execution`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(links.masterOrderRef).toBe(masterOrderRef);
    expect(links.supplierOrderCount).toBe(1);
  });

  test("03 — Buyer execution route redirects to organization workspace", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/execution/${containerId}`);
    await expect(page).toHaveURL(new RegExp(`/buyer/mixed-container/organization/${containerId}`));
    await expect(page.getByTestId("mc-organization-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-org-modules")).toBeVisible();
  });

  test("04 — FreightIQ and Shipment eligibility via existing Order runtime", async () => {
    const req = await newRequest();
    const future = new Date(Date.now() + 30 * 86400000).toISOString();
    await req.post(`${API_BASE}/api/orders/${supplierOrderId}/actions/supplier-confirm-order`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: { plannedCompletionDate: future } },
    });
    await req.post(`${API_BASE}/api/orders/${supplierOrderId}/actions/start-production`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: { plannedCompletionDate: future } },
    });
    await req.post(`${API_BASE}/api/orders/${supplierOrderId}/actions/mark-production-completed`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: {} },
    });
    await req.post(`${API_BASE}/api/orders/${supplierOrderId}/actions/skip-inspection`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: {} },
    });

    const order = await req.get(`${API_BASE}/api/orders/${supplierOrderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { state: string };
    expect(order.state).toBe("FREIGHT_REQUESTED");

    const freight = await req.post(`${API_BASE}/api/freightiq/orders/${supplierOrderId}/actions/create-request`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          mode: "OCEAN_FCL",
          pol: "CNSHA",
          pod: "NLRTM",
          cargoDescription: "SmartContainer E2E cargo",
          containerType: "40HC",
        },
      },
    });
    expect(freight.ok()).toBeTruthy();

    const ships = await req.get(`${API_BASE}/api/orders/${supplierOrderId}/spawned-shipments`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string }>;
    expect(ships.length).toBeGreaterThanOrEqual(1);
  });

  test("05 — Control Tower smartcontainer alerts", async () => {
    const req = await newRequest();
    await req.post(`${API_BASE}/api/control-tower/scan`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const alerts = await req.get(
      `${API_BASE}/api/control-tower/alerts?category=MIXED_CONTAINER&workspaceId=${containerId}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const keys = ((await alerts.json()).items ?? []).map((a: { alertKey: string }) => a.alertKey);
    expect(keys.some((k: string) => k.startsWith("smartcontainer") || k.startsWith("mixed_container"))).toBeTruthy();
  });
});
