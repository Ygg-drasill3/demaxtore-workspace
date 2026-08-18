import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PurchaseOrderSummary } from "@dmx/contracts/purchase-order";
import PoWorkspacePage from "../PoWorkspacePage";

const getMock = vi.fn();
const actionMock = vi.fn();

vi.mock("../../lib/purchase-order.api", () => ({
  purchaseOrderApi: {
    get: (...args: unknown[]) => getMock(...args),
    action: (...args: unknown[]) => actionMock(...args),
  },
}));

vi.mock("@/store/auth.store", () => ({
  useAuth: (sel: (s: { user: { role: string } }) => unknown) =>
    sel({ user: { role: "BUYER" } }),
}));

vi.mock("@/lib/socket", () => ({
  useWorkspaceSocket: () => undefined,
}));

vi.mock("@/features/trade-documents/components/TradeDocumentsTab", () => ({
  default: () => <div data-testid="trade-docs-stub" />,
}));

vi.mock("../../components/CommercialDocumentCenter/CommercialDocumentCenter", () => ({
  CommercialDocumentCenter: () => <div data-testid="po-commercial-documents" />,
}));

vi.mock("@/features/workspace-communication/components/WorkspaceCommunicationPanel", () => ({
  default: () => null,
}));

vi.mock("@/features/payments/components/OnlinePaymentDisabledNotice", () => ({
  OnlinePaymentDisabledNotice: () => null,
}));

function directPoSummary(overrides: Partial<PurchaseOrderSummary["purchaseOrder"]> = {}): PurchaseOrderSummary {
  return {
    purchaseOrder: {
      id: "po-direct-1",
      orderId: "order-1",
      orderRef: "ORD-1",
      poNumber: "PO-2026-00128",
      buyerId: "buyer-1",
      supplierId: "supplier-1",
      buyerName: "Buyer Org",
      supplierName: "Acme Manufacturing",
      buyerEmail: "buyer@example.com",
      supplierEmail: "supplier@example.com",
      currency: "USD",
      incoterm: "FOB",
      paymentTerms: "Net 30",
      deliveryTerms: "Ship within 14 days",
      status: "SUBMITTED",
      source: "DIRECT",
      version: 1,
      documentUrl: "https://example.com/po.pdf",
      documentFileName: "po.pdf",
      issuedAt: "2026-07-27T10:00:00.000Z",
      closedAt: null,
      createdAt: "2026-07-27T10:00:00.000Z",
      updatedAt: "2026-07-27T10:00:00.000Z",
      buyerReference: "REF-9",
      notes: "Handle with care",
      expectedDeliveryDate: "2026-08-15",
      destinationCountry: "TR",
      destinationPort: "Istanbul",
      rfqWorkspaceId: null,
      documents: [
        {
          id: "doc-1",
          fileName: "po.pdf",
          documentUrl: "https://example.com/po.pdf",
          mimeType: "application/pdf",
          uploadedAt: "2026-07-27T10:00:00.000Z",
        },
      ],
      ...overrides,
    },
    lines: [
      {
        id: "line-1",
        purchaseOrderId: "po-direct-1",
        sku: "SKU-1",
        description: "Wheat flour",
        quantity: 10,
        unitPrice: 12.5,
        lineTotal: 125,
        createdAt: "2026-07-27T10:00:00.000Z",
        productName: "Wheat flour",
        productCode: "SKU-1",
        specification: "Type 550",
        packaging: "25kg bag",
        unit: "kg",
      },
    ],
    revisions: [
      {
        id: "rev-1",
        purchaseOrderId: "po-direct-1",
        revisionNumber: 1,
        createdById: "buyer-1",
        createdBy: { id: "buyer-1", name: "Buyer One" },
        reason: "Initial issue",
        snapshotJson: {
          header: { currency: "USD", paymentTerms: "Net 30" },
          lines: [{ sku: "SKU-1", description: "Wheat flour", quantity: 10, unitPrice: 12.5, lineTotal: 125 }],
        },
        createdAt: "2026-07-27T10:00:00.000Z",
        isCurrent: true,
      },
    ],
    acknowledgements: [],
    amendments: [],
    pendingAcknowledgement: true,
    openAmendments: 0,
  };
}

function renderPage(poId = "po-direct-1") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/workspace/po/${poId}`]}>
        <Routes>
          <Route path="/workspace/po/:id" element={<PoWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("<PoWorkspacePage /> Direct PO", () => {
  beforeEach(() => {
    getMock.mockReset();
    actionMock.mockReset();
  });

  it("renders Direct PO workspace without RFQ content", async () => {
    getMock.mockResolvedValue(directPoSummary());
    renderPage();

    await waitFor(() => expect(screen.getByTestId("po-workspace")).toBeInTheDocument());
    expect(screen.getByTestId("po-number")).toHaveTextContent("PO-2026-00128");
    expect(screen.getByTestId("po-source")).toHaveTextContent("uploaded document");
    expect(screen.getByTestId("po-line-line-1")).toHaveTextContent("Wheat flour");
    expect(screen.getByTestId("po-linked-order")).toHaveAttribute("href", "/workspace/order/order-1");
  });

  it("renders a human status label rather than the raw enum", async () => {
    getMock.mockResolvedValue(directPoSummary({ status: "IN_EXECUTION" }));
    renderPage();
    await waitFor(() => expect(screen.getByTestId("po-status")).toBeInTheDocument());
    expect(screen.getByTestId("po-status")).toHaveTextContent("In execution");
    expect(screen.getByTestId("po-status")).not.toHaveTextContent("IN_EXECUTION");
  });

  it("labels a system generated PO by its source", async () => {
    getMock.mockResolvedValue(directPoSummary({ source: "RFQ" }));
    renderPage();
    await waitFor(() => expect(screen.getByTestId("po-source")).toBeInTheDocument());
    expect(screen.getByTestId("po-source")).toHaveTextContent("system generated");
  });

  it("does not render broken order link when orderId missing", async () => {
    getMock.mockResolvedValue(directPoSummary({ orderId: "" as unknown as string }));
    renderPage();
    await waitFor(() => expect(screen.getByTestId("po-order-unavailable")).toBeInTheDocument());
    expect(screen.queryByTestId("po-linked-order")).not.toBeInTheDocument();
  });

  it("shows Not specified for unpriced lines and partial pricing messaging", async () => {
    const summary = directPoSummary();
    summary.lines = [
      {
        ...summary.lines[0],
        id: "priced",
        unitPrice: 10,
        lineTotal: 100,
        quantity: 10,
      },
      {
        ...summary.lines[0],
        id: "unpriced",
        unitPrice: null,
        lineTotal: null,
        quantity: 5,
      },
    ];
    getMock.mockResolvedValue(summary);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("po-lines-partial-pricing")).toBeInTheDocument());
    expect(screen.getByTestId("po-line-unpriced")).toHaveTextContent("Not specified");
  });

  it("submits an action once and refreshes detail on success", async () => {
    getMock.mockResolvedValue(directPoSummary());
    let resolveAction: (v: PurchaseOrderSummary) => void = () => undefined;
    actionMock.mockImplementation(
      () =>
        new Promise<PurchaseOrderSummary>((resolve) => {
          resolveAction = resolve;
        }),
    );

    renderPage();
    await waitFor(() => expect(screen.getByTestId("po-action-cancel")).toBeInTheDocument());

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Cancel for test");
    const btn = screen.getByTestId("po-action-cancel");
    btn.click();
    await waitFor(() => expect(actionMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(btn).toBeDisabled());

    const next = directPoSummary({ status: "CANCELLED" });
    resolveAction(next);
    await waitFor(() => expect(getMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    promptSpy.mockRestore();
  });
});
