import { describe, expect, it } from "vitest";
import {
  emptyValue,
  formatPoMoney,
  formatPoQuantity,
  summarizeLinePricing,
} from "./purchase-order.formatters";
import {
  purchaseOrderSourceLabel,
  purchaseOrderStatusLabel,
} from "./purchase-order.labels";
import { purchaseOrderRoutes } from "./purchase-order.routes";
import { normalizePurchaseOrderWorkspace } from "./normalize-purchase-order-workspace";
import {
  LEGACY_PURCHASE_ORDER_STATUS_VALUES,
  type PurchaseOrderSummary,
} from "@dmx/contracts/purchase-order";

describe("purchase-order.labels", () => {
  it("maps sources to human labels", () => {
    expect(purchaseOrderSourceLabel("DIRECT")).toBe("Direct purchase");
    expect(purchaseOrderSourceLabel("RFQ")).toBe("RFQ");
    expect(purchaseOrderSourceLabel("LEGACY")).toBe("Legacy");
    expect(purchaseOrderSourceLabel("manual")).toBe("Direct purchase");
    expect(purchaseOrderSourceLabel(null)).toBe("Legacy");
  });

  it("maps canonical FSM statuses to human labels", () => {
    expect(purchaseOrderStatusLabel("SUBMITTED")).toBe("Submitted");
    expect(purchaseOrderStatusLabel("IN_EXECUTION")).toBe("In execution");
    expect(purchaseOrderStatusLabel("CANCELLED")).toBe("Cancelled");
    expect(purchaseOrderStatusLabel(null)).toBe("Unknown");
  });

  it("labels deprecated statuses through their canonical FSM state", () => {
    // PRR-01 retired ISSUED / ACKNOWLEDGED / AMENDMENT_REQUESTED / AMENDED. Old rows
    // must never render a raw enum name.
    expect(purchaseOrderStatusLabel("ISSUED")).toBe("Submitted");
    expect(purchaseOrderStatusLabel("ACKNOWLEDGED")).toBe("Approved");
    for (const legacy of LEGACY_PURCHASE_ORDER_STATUS_VALUES) {
      expect(purchaseOrderStatusLabel(legacy)).not.toBe(legacy);
    }
  });
});

describe("purchase-order.formatters", () => {
  it("formats empty values consistently", () => {
    expect(emptyValue(null)).toBe("Not specified");
    expect(emptyValue("")).toBe("Not specified");
    expect(emptyValue("FOB")).toBe("FOB");
  });

  it("formats money with currency", () => {
    const formatted = formatPoMoney(1250, "USD", "tr-TR");
    expect(formatted).toMatch(/1\.250,00/);
    expect(formatted).toMatch(/\$|USD|US\$/);
  });

  it("formats quantities without forcing 2 decimals", () => {
    expect(formatPoQuantity(1)).toBe("1");
    expect(formatPoQuantity(2.5)).toMatch(/2[,.]5/);
    expect(formatPoQuantity(100.25)).toMatch(/100[,.]25/);
  });

  it("summarizes full / none / partial pricing", () => {
    expect(summarizeLinePricing([{ unitPrice: 10, quantity: 2, lineTotal: 20 }])).toEqual({
      kind: "full",
      subtotal: 20,
    });
    expect(summarizeLinePricing([{ unitPrice: null, quantity: 2 }])).toEqual({ kind: "none" });
    expect(
      summarizeLinePricing([
        { unitPrice: 10, quantity: 1, lineTotal: 10 },
        { unitPrice: null, quantity: 1 },
      ]),
    ).toEqual({ kind: "partial" });
  });
});

describe("purchase-order.routes", () => {
  it("generates workspace routes", () => {
    expect(purchaseOrderRoutes.detail("po_123")).toBe("/workspace/po/po_123");
    expect(purchaseOrderRoutes.orderWorkspace("ord_1")).toBe("/workspace/order/ord_1");
    expect(purchaseOrderRoutes.rfqWorkspace("rfq_1")).toBe("/workspace/rfq/rfq_1");
  });
});

describe("normalizePurchaseOrderWorkspace", () => {
  it("normalizes legacy document url and source fallback", () => {
    const summary = {
      purchaseOrder: {
        id: "1",
        orderId: "o1",
        orderRef: null,
        poNumber: "PO-1",
        buyerId: "b",
        supplierId: "s",
        currency: "USD",
        incoterm: null,
        paymentTerms: null,
        deliveryTerms: null,
        status: "ISSUED",
        source: "manual",
        documentUrl: null,
        documentFileName: null,
        issuedAt: null,
        closedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        documents: [{ id: "d1", fileName: "po.pdf", documentUrl: "", url: "https://example.com/po.pdf" }],
      },
      lines: [],
      revisions: [],
      acknowledgements: [],
      amendments: [],
      pendingAcknowledgement: false,
      openAmendments: 0,
    } as unknown as PurchaseOrderSummary;

    const normalized = normalizePurchaseOrderWorkspace(summary);
    expect(normalized.purchaseOrder.source).toBe("DIRECT");
    expect(normalized.purchaseOrder.documents?.[0]?.documentUrl).toBe("https://example.com/po.pdf");
  });
});
