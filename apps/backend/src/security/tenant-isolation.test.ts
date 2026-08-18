/**
 * Phase 12 — live cross-tenant / IDOR regression (pilot-critical resources).
 * Requires running backend + seeded pilot users (buyer1/buyer2, broker/trucker smoke accounts).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { testApiFetch, testApiLogin } from "../test/integration-http.js";

const BUYER_A = "buyer1@acme.test";
const BUYER_B = "buyer2@beta.test";
const BROKER = "broker.smoke@demaxtore.local";
const TRUCKER = "trucker.smoke@demaxtore.local";

async function discoverBuyerAIds(token: string) {
  const poList = await testApiFetch("/api/purchase-orders?limit=1", token).then((r) => r.json());
  const po = poList.items?.[0] ?? poList[0];
  const shipList = await testApiFetch("/api/shipments/portfolio?limit=1", token).then((r) => r.json());
  const shipment = shipList.items?.[0] ?? shipList[0];
  const prodList = await testApiFetch("/api/products?limit=1", token).then((r) => r.json());
  const product = prodList.items?.[0] ?? prodList[0];
  const customsList = await testApiFetch("/api/customs/cases?limit=1", token).then((r) => r.json());
  const customsCase = customsList.items?.[0] ?? customsList[0];
  const lcList = await testApiFetch("/api/landed-cost?limit=1", token).then((r) => r.json());
  const landedCost = lcList.items?.[0] ?? lcList[0];
  return {
    poId: po?.id as string | undefined,
    shipmentId: shipment?.id as string | undefined,
    productId: product?.id as string | undefined,
    customsCaseId: customsCase?.id as string | undefined,
    landedCostId: landedCost?.id as string | undefined,
  };
}

function expectDenied(status: number) {
  expect([401, 403, 404, 400, 422]).toContain(status);
}

describe("Phase 12 tenant isolation — Buyer B → Buyer A", () => {
  let buyerA: string;
  let buyerB: string;
  let ids: Awaited<ReturnType<typeof discoverBuyerAIds>>;

  beforeAll(async () => {
    buyerA = await testApiLogin(BUYER_A);
    buyerB = await testApiLogin(BUYER_B);
    ids = await discoverBuyerAIds(buyerA);
  });

  it("denies foreign product by ID", async () => {
    if (!ids.productId) return;
    const res = await testApiFetch(`/api/products/${ids.productId}`, buyerB);
    expectDenied(res.status);
  });

  it("denies foreign purchase order by ID", async () => {
    if (!ids.poId) return;
    const res = await testApiFetch(`/api/purchase-orders/${ids.poId}`, buyerB);
    expectDenied(res.status);
  });

  it("denies foreign PO related-entities", async () => {
    if (!ids.poId) return;
    const res = await testApiFetch(`/api/purchase-orders/${ids.poId}/related-entities`, buyerB);
    expectDenied(res.status);
  });

  it("denies foreign shipment by ID", async () => {
    if (!ids.shipmentId) return;
    const res = await testApiFetch(`/api/shipments/${ids.shipmentId}`, buyerB);
    expectDenied(res.status);
  });

  it("denies foreign shipment documents", async () => {
    if (!ids.shipmentId) return;
    const res = await testApiFetch(`/api/shipments/${ids.shipmentId}/documents`, buyerB);
    expectDenied(res.status);
  });

  it("denies foreign trade-documents summary", async () => {
    if (!ids.shipmentId) return;
    const res = await testApiFetch(`/api/trade-documents/SHIPMENT/${ids.shipmentId}`, buyerB);
    expectDenied(res.status);
  });

  it("denies foreign customs case", async () => {
    if (!ids.customsCaseId) return;
    const res = await testApiFetch(`/api/customs/cases/${ids.customsCaseId}`, buyerB);
    expectDenied(res.status);
  });

  it("denies foreign landed cost", async () => {
    if (!ids.landedCostId) return;
    const res = await testApiFetch(`/api/landed-cost/${ids.landedCostId}`, buyerB);
    expectDenied(res.status);
  });

  it("denies cross-tenant line allocation mutation", async () => {
    if (!ids.shipmentId || !ids.poId) return;
    const po = await testApiFetch(`/api/purchase-orders/${ids.poId}`, buyerA).then((r) => r.json());
    const lineId = po.lines?.[0]?.id ?? po.lineItems?.[0]?.id;
    if (!lineId) return;
    const res = await testApiFetch("/api/shipments/line-allocations", buyerB, {
      method: "POST",
      body: JSON.stringify({
        shipmentWorkspaceId: ids.shipmentId,
        purchaseOrderLineId: lineId,
        quantity: 1,
      }),
    });
    expectDenied(res.status);
  });

  it("denies foreign transaction cost injection", async () => {
    if (!ids.shipmentId) return;
    const res = await testApiFetch("/api/landed-cost/transaction-costs", buyerB, {
      method: "POST",
      body: JSON.stringify({
        shipmentWorkspaceId: ids.shipmentId,
        componentType: "OTHER",
        amount: 42,
        currency: "USD",
        description: "cross-tenant probe",
      }),
    });
    expectDenied(res.status);
  });
});

describe("Phase 12 partner isolation", () => {
  let broker: string;
  let trucker: string;
  let buyerA: string;
  let ids: Awaited<ReturnType<typeof discoverBuyerAIds>>;

  beforeAll(async () => {
    buyerA = await testApiLogin(BUYER_A);
    broker = await testApiLogin(BROKER);
    trucker = await testApiLogin(TRUCKER);
    ids = await discoverBuyerAIds(buyerA);
  });

  it("allows assigned broker read on assigned customs case", async () => {
    // The broker's own home payload is the only source that guarantees an active
    // CUSTOMS_BROKER assignment; buyer A's newest case may have no broker at all.
    const home = await testApiFetch("/api/partner/home", broker).then((r) => r.json());
    const assignedCaseId = home.customsCases?.[0]?.customsCaseId as string | undefined;
    if (!assignedCaseId) return;
    const res = await testApiFetch(`/api/customs/cases/${assignedCaseId}`, broker);
    expect(res.status).toBe(200);
  });

  it("denies broker on a customs case they are not assigned to", async () => {
    const home = await testApiFetch("/api/partner/home", broker).then((r) => r.json());
    const assigned = new Set<string>(
      (home.customsCases ?? []).map((c: { customsCaseId: string }) => c.customsCaseId),
    );
    const all = await testApiFetch("/api/customs/cases?limit=50", buyerA).then((r) => r.json());
    const unassigned = (all.items ?? []).find((c: { id: string }) => !assigned.has(c.id));
    if (!unassigned) return;
    const res = await testApiFetch(`/api/customs/cases/${unassigned.id}`, broker);
    expectDenied(res.status);
  });

  it("denies broker on random foreign customs case id", async () => {
    const res = await testApiFetch(`/api/customs/cases/${crypto.randomUUID()}`, broker);
    expectDenied(res.status);
  });

  it("denies broker duty-tax rule admin mutation", async () => {
    const res = await testApiFetch("/api/customs/duty-tax/rules", broker, {
      method: "POST",
      body: JSON.stringify({
        componentType: "DUTY",
        gtipCode: "0000000000",
        ratePercent: 1,
      }),
    });
    expectDenied(res.status);
  });

  it("allows assigned trucker partner transaction on assigned shipment", async () => {
    if (!ids.shipmentId) return;
    const res = await testApiFetch(`/api/partner/transactions/${ids.shipmentId}`, trucker);
    expect(res.status).toBe(200);
  });

  it("denies trucker customs case get", async () => {
    if (!ids.customsCaseId) return;
    const res = await testApiFetch(`/api/customs/cases/${ids.customsCaseId}`, trucker);
    expectDenied(res.status);
  });

  it("denies broker organisation-wide customs list", async () => {
    const res = await testApiFetch("/api/customs/cases?limit=1", broker);
    expectDenied(res.status);
  });

  it("allows assigned trucker inland get from home queue", async () => {
    const home = await testApiFetch("/api/partner/home", trucker).then((r) => r.json());
    expect(home.customsCases).toBeUndefined();
    const inlandId = home.inlandDeliveries?.[0]?.inlandDeliveryId as string | undefined;
    if (!inlandId) return;
    const res = await testApiFetch(`/api/inland/${inlandId}`, trucker);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inlandCostAmount).toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/buyRate/i);
    expect(JSON.stringify(body)).not.toMatch(/margin/i);
  });

  it("denies trucker organisation-wide inland list", async () => {
    const res = await testApiFetch("/api/inland", trucker);
    expectDenied(res.status);
  });

  it("denies trucker on random foreign inland id", async () => {
    const res = await testApiFetch(`/api/inland/${crypto.randomUUID()}`, trucker);
    expectDenied(res.status);
  });

  it("denies broker inland get for a trucker-assigned delivery", async () => {
    const home = await testApiFetch("/api/partner/home", trucker).then((r) => r.json());
    const inlandId = home.inlandDeliveries?.[0]?.inlandDeliveryId as string | undefined;
    if (!inlandId) return;
    const res = await testApiFetch(`/api/inland/${inlandId}`, broker);
    expectDenied(res.status);
  });

  it("denies trucker duty-tax on a customs case", async () => {
    if (!ids.customsCaseId) return;
    const res = await testApiFetch(`/api/customs/cases/${ids.customsCaseId}/duty-tax`, trucker);
    expectDenied(res.status);
  });

  it("denies trucker landed-cost list/detail", async () => {
    const list = await testApiFetch("/api/landed-cost?limit=1", trucker);
    expectDenied(list.status);
    if (!ids.landedCostId) return;
    const res = await testApiFetch(`/api/landed-cost/${ids.landedCostId}`, trucker);
    expectDenied(res.status);
  });
});
