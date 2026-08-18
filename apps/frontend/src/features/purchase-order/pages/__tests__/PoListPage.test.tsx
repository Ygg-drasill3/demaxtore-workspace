import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PoListPage from "../PoListPage";
import PoOverviewWidget from "../../components/PoOverviewWidget";

const listMock = vi.fn();
const dashboardMock = vi.fn();
const searchSuppliersMock = vi.fn();

vi.mock("../../lib/purchase-order.api", () => ({
  purchaseOrderApi: {
    list: (...args: unknown[]) => listMock(...args),
    dashboard: (...args: unknown[]) => dashboardMock(...args),
    searchSuppliers: (...args: unknown[]) => searchSuppliersMock(...args),
  },
}));

vi.mock("@/store/auth.store", () => ({
  useAuth: (sel: (s: { user: { role: string } }) => unknown) =>
    sel({ user: { role: "BUYER" } }),
}));

function renderList(initial = "/buyer/purchase-orders") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/buyer/purchase-orders" element={<PoListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const sampleItem = {
  id: "po-1",
  orderId: "ord-1",
  poNumber: "PO-2026-00128",
  source: "DIRECT" as const,
  status: "ISSUED" as const,
  supplier: { id: "s1", companyName: "Acme Manufacturing" },
  currency: "USD",
  totalAmount: 125,
  pricingState: "COMPLETE" as const,
  lineCount: 1,
  issuedAt: "2026-07-27T10:00:00.000Z",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
};

describe("<PoListPage />", () => {
  beforeEach(() => {
    listMock.mockReset();
    searchSuppliersMock.mockResolvedValue([]);
  });

  it("renders Direct PO row with badges and links", async () => {
    listMock.mockResolvedValue({
      items: [sampleItem],
      pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("po-list-row-po-1")).toBeInTheDocument());
    expect(screen.getByTestId("po-open-po-1")).toHaveAttribute("href", "/workspace/po/po-1");
    expect(screen.getByTestId("po-order-link-po-1")).toHaveAttribute("href", "/workspace/order/ord-1");
    expect(screen.getAllByTestId("po-source-badge")[0]).toHaveTextContent("Direct purchase");
    // PRR-01 retired ISSUED; the row renders its canonical FSM label.
    expect(screen.getAllByTestId("po-status-badge")[0]).toHaveTextContent("Submitted");
  });

  it("shows unavailable order workspace when orderId missing", async () => {
    listMock.mockResolvedValue({
      items: [{ ...sampleItem, orderId: null }],
      pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
    });
    renderList();
    await waitFor(() => expect(screen.getByText("Unavailable")).toBeInTheDocument());
  });

  it("shows partial pricing honestly", async () => {
    listMock.mockResolvedValue({
      items: [{ ...sampleItem, totalAmount: null, pricingState: "PARTIAL" }],
      pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
    });
    renderList();
    await waitFor(() => expect(screen.getAllByText("Partial pricing").length).toBeGreaterThan(0));
  });
});

describe("<PoOverviewWidget />", () => {
  beforeEach(() => {
    dashboardMock.mockReset();
  });

  it("renders Direct source breakdown and create CTA for BUYER", async () => {
    dashboardMock.mockResolvedValue({
      openPoCount: 2,
      acknowledgementPending: 1,
      amendmentsOpen: 0,
      poValueOpen: 0,
      closedPoValue: 0,
      bySource: { RFQ: 1, DIRECT: 1, REORDER: 0, API: 0, LEGACY: 0, COMMODITY_BID: 0 },
      totals: {
        all: 2, draft: 0, issued: 2, acknowledged: 0,
        amendmentRequested: 0, amended: 0, closed: 0, cancelled: 0,
      },
      operational: { active: 2, awaitingAcknowledgement: 1, expectedWithin30Days: 0 },
      valueByCurrency: [{ currency: "USD", openTotal: 100, closedTotal: 0 }],
      recent: [sampleItem],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PoOverviewWidget />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("po-source-link-DIRECT")).toBeInTheDocument());
    expect(screen.getByTestId("po-source-link-DIRECT")).toHaveAttribute(
      "href",
      "/buyer/purchase-orders?source=DIRECT",
    );
    expect(screen.getByTestId("po-dashboard-create-cta")).toBeInTheDocument();
    expect(screen.getByTestId("po-recent-po-1")).toHaveTextContent("PO-2026-00128");
  });
});
