// Sprint 6A — FreightIQ commercialization (margin, display price, revenue ledger)
import { test, expect } from "@playwright/test";
import {
  USERS, apiLogin, newRequest, API_BASE,
  setupSubmittedRfqWithStrategy, assignAndPublish, closeQuotationsAndStartEvaluation,
} from "./_helpers";

type FreightOffer = {
  id: string;
  price: number;
  commercial?: {
    internalCostUsd: number;
    freightiqMarginUsd: number;
    displayPriceUsd: number;
  };
};

type FreightSummary = {
  offers: FreightOffer[];
  commercialSummary?: {
    fobValueUsd: number;
    displayFreightUsd: number | null;
    estimatedCifUsd: number | null;
  };
};

async function bootstrapOrderProductionComplete(): Promise<string> {
  const req = await newRequest();
  const buyerToken = await apiLogin(req, USERS.buyer1);
  const adminToken = await apiLogin(req, USERS.admin);
  const supplierToken = await apiLogin(req, USERS.supA1);
  const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
  const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  const ts = Date.now();
  const rfq = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Freight 6A ${ts}`);
  await assignAndPublish(req, adminToken, rfq.id, [USERS.supA1.email]);
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 10, unitPrice: 8 }] },
  });
  await closeQuotationsAndStartEvaluation(req, buyerToken, rfq.id, "freight commercialization E2E");
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "6a" } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/request-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
  });
  const fd = new FormData();
  fd.append("file", new Blob([Buffer.from("x")], { type: "application/pdf" }), "p.pdf");
  const up = await fetch(`${API_BASE}/api/rfq/${rfq.id}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${supplierToken}` },
    body: fd as unknown as BodyInit,
  });
  const upJson = await up.json();
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/submit-proforma`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfq.id}/attachments/${upJson.id}` } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/approve-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
  });
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/issue-po`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  const orders = await req.get(`${API_BASE}/api/rfq/${rfq.id}/spawned-orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  const orderId = orders[0].id;
  const future = new Date(Date.now() + 30 * 86400_000).toISOString();
  await req.post(`${API_BASE}/api/orders/${orderId}/actions/supplier-confirm-order`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { plannedCompletionDate: future } },
  });
  await req.post(`${API_BASE}/api/orders/${orderId}/actions/start-production`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { plannedCompletionDate: future } },
  });
  await req.post(`${API_BASE}/api/orders/${orderId}/actions/mark-production-completed`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: {} },
  });
  return orderId;
}

test.describe.serial("Freight commercialization (Sprint 6A)", () => {
  let orderId = "";
  let offerId = "";
  let shipmentId = "";
  const internalCost = 2000;
  const margin = 350;
  const displayPrice = internalCost + margin;

  test.beforeAll(async () => {
    orderId = await bootstrapOrderProductionComplete();
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/create-request`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          mode: "OCEAN_FCL",
          pol: "CNSHA",
          pod: "NLRTM",
          cargoDescription: "6A commercial",
          containerType: "40HC",
        },
      },
    });
    const fwd = await req.post(`${API_BASE}/api/freightiq/forwarders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        companyName: `6A Fwd ${Date.now()}`,
        contactName: "Ops",
        email: `fwd-6a-${Date.now()}@forwarder.test`,
        country: "NL",
      },
    });
    const forwarderId = (await fwd.json() as { id: string }).id;
    const validUntil = new Date(Date.now() + 21 * 86400_000).toISOString();
    const intake = await req.post(
      `${API_BASE}/api/freightiq/orders/${orderId}/communications/intake-offer`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          payload: {
            forwarderContactId: forwarderId,
            offerSource: "MANUAL_ENTRY",
            carrierName: "MSC",
            vesselName: "MSC 6A",
            etd: new Date(Date.now() + 14 * 86400_000).toISOString(),
            eta: new Date(Date.now() + 40 * 86400_000).toISOString(),
            transitDays: 26,
            cutOff: new Date(Date.now() + 10 * 86400_000).toISOString(),
            internalCostUsd: internalCost,
            freightiqMarginUsd: margin,
            currency: "USD",
            validUntil,
          },
        },
      },
    );
    expect(intake.ok()).toBeTruthy();
    const body = await intake.json() as FreightSummary;
    offerId = body.offers[0].id;
  });

  test("01 — Admin sees cost, margin, display price", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as FreightSummary;
    const o = summary.offers.find((x) => x.id === offerId)!;
    expect(o.commercial?.internalCostUsd).toBe(internalCost);
    expect(o.commercial?.freightiqMarginUsd).toBe(margin);
    expect(o.commercial?.displayPriceUsd).toBe(displayPrice);
    expect(o.price).toBe(displayPrice);
  });

  test("02 — Buyer cannot see cost or margin", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as FreightSummary;
    const o = summary.offers.find((x) => x.id === offerId)!;
    expect(o.commercial).toBeUndefined();
    expect(o.price).toBe(displayPrice);
  });

  test("03 — Supplier cannot see cost or margin", async () => {
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    }).then((r) => r.json()) as FreightSummary;
    const o = summary.offers.find((x) => x.id === offerId)!;
    expect(o.commercial).toBeUndefined();
    expect(o.price).toBe(displayPrice);
  });

  test("04 — CIF calculation uses display freight", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as FreightSummary;
    expect(summary.commercialSummary).toBeTruthy();
    const fob = summary.commercialSummary!.fobValueUsd;
    expect(summary.commercialSummary!.displayFreightUsd).toBe(displayPrice);
    expect(summary.commercialSummary!.estimatedCifUsd).toBe(fob + displayPrice);
  });

  test("05 — Select offer creates PENDING ledger", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const sel = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/select-offer`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: { offerId } },
    });
    expect(sel.ok()).toBeTruthy();
    const adminToken = await apiLogin(req, USERS.admin);
    const report = await req.get(`${API_BASE}/api/freightiq/commercial/report`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { pendingRevenue: Array<{ freightOfferId: string; status: string; freightiqMarginUsd: number }> };
    const entry = report.pendingRevenue.find((e) => e.freightOfferId === offerId);
    expect(entry?.status).toBe("PENDING");
    expect(entry?.freightiqMarginUsd).toBe(margin);
  });

  test("06 — Shipment completed realizes revenue", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const adminToken = await apiLogin(req, USERS.admin);
    await req.post(`${API_BASE}/api/orders/${orderId}/actions/skip-inspection`, {
      headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
    });
    const shipments = await req.get(`${API_BASE}/api/orders/${orderId}/spawned-shipments`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string }>;
    shipmentId = shipments[0].id;
    const h = { headers: { Authorization: `Bearer ${adminToken}` } };
    const steps = [
      "confirm-booking", "confirm-booking", "assign-container", "load-vessel",
      "depart-vessel", "arrive-destination", "start-customs", "complete-customs",
    ] as const;
    for (const step of steps) {
      const body = step === "assign-container"
        ? { payload: { containerNumber: "MSKU6A9999999" } }
        : step === "load-vessel"
          ? { payload: { vesselName: "MV 6A" } }
          : step === "confirm-booking"
            ? { payload: { carrierName: "MSC", bookingRef: "BK-6A" } }
            : { payload: {} };
      const stepRes = await req.post(`${API_BASE}/api/shipments/${shipmentId}/actions/${step}`, { ...h, data: body });
      expect(stepRes.ok(), `shipment step ${step}`).toBeTruthy();
    }
    const delivery = await req.post(`${API_BASE}/api/shipments/${shipmentId}/actions/confirm-delivery`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: {} },
    });
    expect(delivery.ok()).toBeTruthy();
    const delivered = await req.get(`${API_BASE}/api/shipments/${shipmentId}`, h).then((r) => r.json()) as { state: string };
    expect(delivered.state).toBe("DELIVERED");

    const tradeSummary = await req.get(`${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}`, h)
      .then((r) => r.json()) as { compliance: { requiredCount: number } };
    if (tradeSummary.compliance.requiredCount > 0) {
      for (const doc of ["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING"] as const) {
        const fd = new FormData();
        fd.append("file", new Blob([Buffer.from("%PDF")], { type: "application/pdf" }), `${doc}.pdf`);
        fd.append("documentType", doc);
        const up = await fetch(`${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
          body: fd as unknown as BodyInit,
        });
        expect(up.ok, `upload ${doc}: ${await up.text()}`).toBeTruthy();
      }
      const docSummary = await req.get(`${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}`, h)
        .then((r) => r.json()) as { documents: Array<{ id: string; documentType: string }> };
      for (const doc of ["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING"] as const) {
        const d = docSummary.documents.find((x) => x.documentType === doc);
        expect(d?.id, `doc ${doc}`).toBeTruthy();
        const appr = await req.post(`${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}/actions/approve-document`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { payload: { documentId: d!.id } },
        });
        expect(appr.ok()).toBeTruthy();
      }
    }

    const complete = await req.post(`${API_BASE}/api/shipments/${shipmentId}/actions/complete-shipment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { complianceOverride: true } },
    });
    expect(complete.ok(), await complete.text()).toBeTruthy();

    const report = await req.get(`${API_BASE}/api/freightiq/commercial/report`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { realizedRevenue: Array<{ freightOfferId: string; status: string }> };
    expect(report.realizedRevenue.some((e) => e.freightOfferId === offerId && e.status === "REALIZED")).toBeTruthy();
  });

  test("07 — Operations dashboards expose commercial KPIs", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const metrics = await req.get(`${API_BASE}/api/freightiq/commercial/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(metrics.ok()).toBeTruthy();
    const body = await metrics.json() as { freightVolume: number; revenuePendingUsd: number };
    expect(body.freightVolume).toBeGreaterThan(0);
    const ops = await req.get(`${API_BASE}/api/freightiq/operations/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(ops.ok()).toBeTruthy();
    const opsBody = await ops.json() as { commercialMetrics?: { revenueRealizedUsd: number } };
    expect(opsBody.commercialMetrics).toBeTruthy();
    const report = await req.get(`${API_BASE}/api/freightiq/commercial/report`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(report.ok()).toBeTruthy();
  });
});
