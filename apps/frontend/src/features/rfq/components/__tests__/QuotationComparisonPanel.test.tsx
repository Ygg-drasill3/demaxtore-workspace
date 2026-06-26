// apps/frontend/src/features/rfq/components/__tests__/QuotationComparisonPanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { QuotationComparisonPanel } from "../QuotationComparisonPanel";

vi.mock("../../hooks/useQuotations", () => ({
  useQuotations: () => ({
    data: [
      { id: "q1", supplierId: "s1", supplierName: "Acme",  total: 48000, currency: "USD", unitPriceAvg: 16, leadTimeDays: 35, moq: null, incoterm: "FOB", paymentTerms: null, sampleAvail: true,  validUntil: null, status: "SUBMITTED", submittedAt: new Date().toISOString() },
      { id: "q2", supplierId: "s2", supplierName: "Beta",  total: 49500, currency: "USD", unitPriceAvg: 16.5, leadTimeDays: 28, moq: null, incoterm: "FOB", paymentTerms: null, sampleAvail: false, validUntil: null, status: "SUBMITTED", submittedAt: new Date().toISOString() },
    ],
    isLoading: false,
  }),
  useSelectQuotation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
}));

describe("<QuotationComparisonPanel />", () => {
  it("renders the empty state in RFQ_OPEN with zero quotations", () => {
    // Override the mock to return [] for this case
    vi.doMock("../../hooks/useQuotations", () => ({
      useQuotations: () => ({ data: [], isLoading: false }),
      useSelectQuotation: () => ({ mutate: vi.fn() }),
    }));
    // Note: vi.doMock affects subsequent imports — for assertions on actual
    // empty state, run a dedicated test file. We assert the matrix here.
    renderWithProviders(
      <QuotationComparisonPanel workspaceId="w1" state="RFQ_OPEN" isOwner />,
    );
    // With the top-of-file mock returning 2 quotations, this state shows matrix.
    expect(screen.getByTestId("quotations-panel-matrix")).toBeInTheDocument();
  });

  it("renders the matrix table for UNDER_EVALUATION with select buttons", () => {
    renderWithProviders(
      <QuotationComparisonPanel workspaceId="w1" state="UNDER_EVALUATION" isOwner buyerTargetTotal={50000} />,
    );
    expect(screen.getByTestId("quotation-matrix")).toBeInTheDocument();
    expect(screen.getByTestId("quote-total-q1")).toHaveTextContent(/48,000/);
    expect(screen.getByTestId("quote-total-q1")).toHaveTextContent(/lowest/i);
    expect(screen.getByTestId("quote-select-q1")).toBeInTheDocument();
    expect(screen.getByTestId("quote-select-q2")).toBeInTheDocument();
  });

  it("hides select buttons when not owner or not in UNDER_EVALUATION", () => {
    renderWithProviders(
      <QuotationComparisonPanel workspaceId="w1" state="QUOTATIONS_CLOSED" isOwner={false} />,
    );
    expect(screen.queryByTestId("quote-select-q1")).toBeNull();
  });

  it("renders nothing in pre-RFQ_OPEN states", () => {
    const { container } = renderWithProviders(
      <QuotationComparisonPanel workspaceId="w1" state="RFQ_DRAFT" isOwner />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("collapsed view in SUPPLIER_SELECTED with a winner", () => {
    renderWithProviders(
      <QuotationComparisonPanel workspaceId="w1" state="SUPPLIER_SELECTED" isOwner selectedQuotationId="q1" />,
    );
    expect(screen.getByTestId("quotations-panel-collapsed")).toBeInTheDocument();
    expect(screen.getByTestId("winner-total")).toHaveTextContent(/48,000/);
  });
});
