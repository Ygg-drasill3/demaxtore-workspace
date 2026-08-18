// apps/frontend/src/features/rfq/components/__tests__/QuotationComparisonPanel.variations.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { useLocale } from "@/i18n/store";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";

vi.mock("../../hooks", () => ({
  useRfqTimeline: () => ({ data: [], isLoading: false }),
}));

function line(
  id: string,
  position: number,
  description: string,
  quantity: number,
  unitPrice: number,
  extra?: Partial<NonNullable<QuotationRowDTO["lineItems"]>[number]>,
) {
  return {
    id,
    position,
    description,
    quantity,
    unitPrice,
    total: quantity * unitPrice,
    ...extra,
  };
}

function oliveOilQuote(variationCount: 1 | 2 | 3 | 4 | 5 | 6): QuotationRowDTO {
  const all = [
    line("li-500", 1, "500 ml Glass Bottle", 1, 2.10, { priceUnit: "Piece", packing: "12 Bottles / Carton" }),
    line("li-1l", 2, "1 L Glass Bottle", 1, 3.85, { priceUnit: "Piece", packing: "6 Bottles / Carton" }),
    line("li-10l", 3, "10 L Tin", 500, 31.00, { priceUnit: "Piece" }),
    line("li-5l", 4, "5 L Canister", 100, 18.50, { priceUnit: "Piece", packing: "4 Canisters / Carton" }),
    line("li-25l", 5, "25 L Drum", 50, 72.00, { priceUnit: "Piece" }),
    line("li-bulk", 6, "Bulk Tanker", 1, 2800, { priceUnit: "Piece" }),
  ];
  const items = all.slice(0, variationCount);
  return {
    id: "q-olive",
    supplierId: "sup-fatih",
    supplierName: "fatih gıda",
    total: items.reduce((s, i) => s + i.total, 0),
    currency: "USD",
    unitPriceAvg: null,
    leadTimeDays: 21,
    moq: 100,
    incoterm: "FOB",
    paymentTerms: null,
    sampleAvail: true,
    validUntil: "2026-12-31T00:00:00.000Z",
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
    lineItems: items,
  };
}

const rfqLines = [{ id: "line-oil", position: 1, description: "Extra Virgin Olive Oil", uom: "Container" }];

function mockUseQuotations(data: QuotationRowDTO[]) {
  vi.doMock("../../hooks/useQuotations", () => ({
    useQuotations: () => ({ data, isLoading: false }),
    useSelectQuotation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
  }));
}

describe("<QuotationComparisonPanel /> multi-variation offers", () => {
  beforeEach(() => {
    useLocale.getState().setLocale("tr");
    vi.resetModules();
  });

  async function renderPanel(state: "RFQ_OPEN" | "UNDER_EVALUATION", variationCount: 1 | 2 | 3 | 4 | 5 | 6) {
    mockUseQuotations([oliveOilQuote(variationCount)]);
    const { QuotationComparisonPanel } = await import("../QuotationComparisonPanel");
    renderWithProviders(
      <QuotationComparisonPanel
        workspaceId="w1"
        state={state}
        isOwner
        rfqLineItems={rfqLines}
        productSummary={{ name: "Extra Virgin Olive Oil", category: "oil" }}
      />,
    );
  }

  it("keeps single-variation UNIT PRICE box", async () => {
    await renderPanel("UNDER_EVALUATION", 1);
    expect(screen.getByTestId("quote-total-q-olive")).toBeInTheDocument();
    expect(screen.queryByTestId("quote-variations-q-olive")).toBeNull();
  });

  it("shows variation grid without top UNIT PRICE for 3 variations", async () => {
    await renderPanel("UNDER_EVALUATION", 3);
    expect(screen.queryByTestId("quote-total-q-olive")).toBeNull();
    const grid = screen.getByTestId("quote-variations-q-olive");
    expect(within(grid).getByText("500 ml Glass Bottle")).toBeInTheDocument();
    expect(within(grid).getByText(/USD 2\.10/)).toBeInTheDocument();
    expect(within(grid).getByText("1 L Glass Bottle")).toBeInTheDocument();
    expect(within(grid).getByText(/USD 3\.85/)).toBeInTheDocument();
    expect(within(grid).getByText("10 L Tin")).toBeInTheDocument();
    expect(within(grid).getByText(/USD 31\.00/)).toBeInTheDocument();
    expect(within(grid).getByText("12 Bottles / Carton")).toBeInTheDocument();
  });

  it("renders 2 variation columns", async () => {
    await renderPanel("UNDER_EVALUATION", 2);
    const grid = screen.getByTestId("quote-variations-q-olive");
    expect(grid.querySelectorAll("[data-testid^='quote-variation-']")).toHaveLength(2);
    expect(grid.className).toContain("md:grid-cols-2");
  });

  it("renders 4 variation columns", async () => {
    await renderPanel("UNDER_EVALUATION", 4);
    const grid = screen.getByTestId("quote-variations-q-olive");
    expect(grid.querySelectorAll("[data-testid^='quote-variation-']")).toHaveLength(4);
    expect(grid.className).toContain("lg:grid-cols-4");
  });

  it("renders 5 variation columns in one row on large screens", async () => {
    await renderPanel("UNDER_EVALUATION", 5);
    const grid = screen.getByTestId("quote-variations-q-olive");
    expect(grid.querySelectorAll("[data-testid^='quote-variation-']")).toHaveLength(5);
    expect(grid.className).toContain("lg:grid-cols-5");
    expect(grid.className).toContain("gap-3");
  });

  it("renders 6 variation columns with max 4-column wrap", async () => {
    await renderPanel("UNDER_EVALUATION", 6);
    const grid = screen.getByTestId("quote-variations-q-olive");
    expect(grid.querySelectorAll("[data-testid^='quote-variation-']")).toHaveLength(6);
    expect(grid.className).toContain("lg:grid-cols-4");
  });

  it("uses single offer-level checkbox — no per-variation checkboxes", async () => {
    await renderPanel("RFQ_OPEN", 3);
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByTestId("quote-award-checkbox-q-olive")).toBeInTheDocument();
  });

  it("selects entire offer via checkbox (award flow)", async () => {
    const user = userEvent.setup();
    await renderPanel("RFQ_OPEN", 3);
    await user.click(screen.getByTestId("quote-award-checkbox-q-olive"));
    expect(screen.getByTestId("quotation-award-select-modal")).toBeInTheDocument();
  });

  it("preserves award checkbox and sidebar select action", async () => {
    await renderPanel("UNDER_EVALUATION", 3);
    expect(screen.getByTestId("quote-award-checkbox-q-olive")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select as Preferred Supplier/i })).toBeInTheDocument();
  });

  it("shows shared terms once at card footer", async () => {
    await renderPanel("UNDER_EVALUATION", 3);
    const terms = screen.getByTestId("quote-terms-q-olive");
    expect(within(terms).getByText("Lead Time")).toBeInTheDocument();
    expect(within(terms).getByText("21 Days")).toBeInTheDocument();
    expect(within(terms).getByText("Incoterm")).toBeInTheDocument();
    expect(within(terms).getByText("FOB")).toBeInTheDocument();
  });
});
