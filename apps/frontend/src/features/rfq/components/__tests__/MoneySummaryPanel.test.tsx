// apps/frontend/src/features/rfq/components/__tests__/MoneySummaryPanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { MoneySummaryPanel } from "../MoneySummaryPanel";

vi.mock("../../hooks/useQuotations", () => ({
  useQuotations: () => ({
    data: [
      { id: "q1", supplierId: "s1", supplierName: "Acme",  total: 48000, currency: "USD", unitPriceAvg: 16, leadTimeDays: 35, moq: null, incoterm: "FOB", paymentTerms: null, sampleAvail: true,  validUntil: null, status: "SUBMITTED", submittedAt: new Date().toISOString() },
      { id: "q2", supplierId: "s2", supplierName: "Beta",  total: 49500, currency: "USD", unitPriceAvg: 16.5, leadTimeDays: 28, moq: null, incoterm: "FOB", paymentTerms: null, sampleAvail: true,  validUntil: null, status: "SUBMITTED", submittedAt: new Date().toISOString() },
      { id: "q3", supplierId: "s3", supplierName: "Gamma", total: 51200, currency: "USD", unitPriceAvg: 17.1, leadTimeDays: 21, moq: null, incoterm: "EXW", paymentTerms: null, sampleAvail: false, validUntil: null, status: "SUBMITTED", submittedAt: new Date().toISOString() },
    ],
    isLoading: false,
  }),
}));

describe("<MoneySummaryPanel />", () => {
  it("shows lowest, highest, average and target", () => {
    renderWithProviders(
      <MoneySummaryPanel
        workspaceId="w1"
        currency="USD"
        estimatedValue={50000}
        selectedQuotationId={null}
      />,
    );
    expect(screen.getByTestId("money-estimated")).toHaveTextContent(/50,000/);
    expect(screen.getByTestId("money-lowest")).toHaveTextContent(/48,000/);
    expect(screen.getByTestId("money-highest")).toHaveTextContent(/51,200/);
    expect(screen.getByTestId("money-average")).toHaveTextContent(/49,567/);  // (48k+49.5k+51.2k)/3 ≈ 49567
  });

  it("highlights the selected quotation total", () => {
    renderWithProviders(
      <MoneySummaryPanel
        workspaceId="w1"
        currency="USD"
        estimatedValue={null}
        selectedQuotationId="q1"
      />,
    );
    expect(screen.getByTestId("money-selected")).toHaveTextContent(/48,000/);
  });
});
