// Sprint 13E — BulkContainer execution bridge E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("BulkContainer execution bridge (Sprint 13E)", () => {
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

  test("01 — Bootstrap container to BC_EXECUTION_READY", async () => {
    const req = await newRequest();
    const catalog = await req.get(`${API_BASE}/api/bulk-container/catalog/products?category=wheat-flour&limit=1`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const product = (await catalog.json()).items[0];

    const create = await req.post(`${API_BASE}/api/bulk-containers`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { currency: "USD" },
    });
    containerId = (await create.json()).id;

    const packingTypeId = product.packingTypes.find((p: { code: string }) => p.code.startsWith("PT-BC-FLOUR"))?.id ?? product.packingTypes[0].id;
    const lineRes = await req.post(`${API_BASE}/api/bulk-containers/${containerId}/lines`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        catalogProductId: product.id,
        packingTypeId,
        quantityMt: 10,
        specValues: { protein: 12, ash: 0.55, moisture: 14, wetGluten: 28, packing: "25 kg paper", origin: "Turkey" },
      },
    });
    expect(lineRes.ok()).toBeTruthy();
    await req.post(`${API_BASE}/api/bulk-containers/${containerId}/actions/submit`, { headers: { Authorization: `Bearer ${buyerToken}` } });

    await req.post(`${API_BASE}/api/admin/bulk-container/procurement/${containerId}/actions/start-procurement`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const bcDetail = await req.get(`${API_BASE}/api/bulk-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { lines: Array<{ id: string }> };
    const lineId = bcDetail.lines[0].id;
    await req.post(`${API_BASE}/api/admin/bulk-container/procurement/${containerId}/quotes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { lineId, supplierCode: "SUP-001", unitPrice: 350, currency: "USD" },
    });
    const offerData = await req.post(`${API_BASE}/api/admin/bulk-container/procurement/${containerId}/offers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { validityHours: 72 },
    }).then((r) => r.json()) as { offers: Array<{ id: string; status: string }> };
    const draftOffer = offerData.offers.find((o) => o.status === "DRAFT")!;
    await req.post(`${API_BASE}/api/admin/bulk-container/procurement/${containerId}/offers/${draftOffer.id}/send`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const bc2 = await req.get(`${API_BASE}/api/bulk-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { activeOfferId: string };
    await req.post(`${API_BASE}/api/bulk-containers/offers/${bc2.activeOfferId}/actions/approve`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });

    const alloc = await req.post(`${API_BASE}/api/admin/bulk-container/allocations/${containerId}/allocations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { lineId, supplierCode: "SUP-001", allocatedQuantityMt: 10 },
    });
    expect(alloc.ok()).toBeTruthy();
    const allocData = await alloc.json() as { allocations: Array<{ id: string }> };
    const allocationId = allocData.allocations[0].id;

    await req.post(`${API_BASE}/api/admin/bulk-container/allocations/${containerId}/allocations/${allocationId}/proformas`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        proformaNumber: "PF-13E-001",
        proformaFileUrl: "https://example.com/pf-13e.pdf",
        currency: "USD",
        amount: 3500,
      },
    });

    const coord = await req.get(`${API_BASE}/api/bulk-containers/${containerId}/coordination`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { payments: Array<{ id: string }> };
    await req.patch(`${API_BASE}/api/admin/bulk-container/allocations/${containerId}/payments/${coord.payments[0].id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "PAYMENT_CONFIRMED" },
    });

    const ws = await req.get(`${API_BASE}/api/bulk-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { state: string };
    expect(ws.state).toBe("BC_EXECUTION_READY");
  });

  test("02 — Spawn master and supplier orders", async () => {
    const req = await newRequest();
    const spawn = await req.post(`${API_BASE}/api/admin/bulk-container/${containerId}/actions/spawn-execution-orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(spawn.ok()).toBeTruthy();
    const result = await spawn.json();
    expect(result.masterOrderRef).toMatch(/^BC-EXEC-\d{4}-\d{5}$/);
    expect(result.supplierOrders.length).toBeGreaterThan(0);
    masterOrderRef = result.masterOrderRef;
    supplierOrderId = result.supplierOrders[0].orderId;
    expect(result.state).toBe("BC_EXECUTION_ACTIVE");

    const exec = await req.get(`${API_BASE}/api/bulk-containers/${containerId}/execution`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(exec.masterOrderRef).toBe(masterOrderRef);
    expect(exec.supplierOrderCount).toBe(1);

    // Seed execution-phase Control Tower alerts while shipments are still pending.
    await req.post(`${API_BASE}/api/control-tower/scan`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  test("03 — Buyer execution dashboard", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/execution/${containerId}`);
    await expect(page.getByTestId("bc-execution-page")).toBeVisible();
    await expect(page.getByText(masterOrderRef)).toBeVisible();
    await expect(page.getByTestId("bc-exec-allocation-Allocation 1")).toBeVisible();
    await expect(page.getByTestId("bc-exec-order-Allocation 1")).toHaveText("ORDER_CREATED");
    await expect(page.getByText(/SUP-/)).toHaveCount(0);
  });

  test("04 — FreightIQ and Shipment via existing Order runtime", async () => {
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
          cargoDescription: "BulkContainer E2E cargo",
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

  test("05 — Order linking and timeline", async () => {
    const req = await newRequest();
    const exec = await req.get(`${API_BASE}/api/bulk-containers/${containerId}/execution`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(exec.timeline.find((t: { key: string }) => t.key === "orders_spawned")?.completed).toBeTruthy();
    expect(exec.allocations[0].allocationRef).toBe("Allocation 1");
    expect(JSON.stringify(exec)).not.toMatch(/SUP-/);
  });

  test("06 — Control Tower execution alerts", async () => {
    const req = await newRequest();
    await req.post(`${API_BASE}/api/control-tower/scan`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const alerts = await req.get(
      `${API_BASE}/api/control-tower/alerts?category=BULK_CONTAINER&workspaceId=${containerId}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const keys = ((await alerts.json()).items ?? []).map((a: { alertKey: string }) => a.alertKey);
    expect(keys).toContain("bulkcontainer_shipment_pending");
  });
});
