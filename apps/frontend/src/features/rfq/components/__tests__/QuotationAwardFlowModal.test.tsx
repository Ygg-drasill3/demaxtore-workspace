import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { useLocale } from "@/i18n/store";
import { QuotationAwardFlowModal } from "../QuotationAwardFlowModal";
import { rfqApi } from "../../lib/rfq.api";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";

vi.mock("../../lib/rfq.api", () => ({
  rfqApi: { action: vi.fn() },
}));

const quotation: QuotationRowDTO = {
  id: "q1",
  supplierId: "s1",
  supplierName: "deneme",
  total: 48000,
  currency: "USD",
  unitPriceAvg: 2,
  leadTimeDays: 30,
  moq: 3,
  incoterm: "FOB",
  paymentTerms: null,
  sampleAvail: true,
  validUntil: "2026-07-18T00:00:00.000Z",
  status: "SUBMITTED",
  submittedAt: new Date().toISOString(),
};

describe("<QuotationAwardFlowModal />", () => {
  beforeEach(() => {
    useLocale.getState().setLocale("tr");
    vi.mocked(rfqApi.action).mockReset();
    vi.mocked(rfqApi.action).mockResolvedValue({});
  });

  it("opens directly on award confirm step (no close-quotations chain)", () => {
    renderWithProviders(
      <QuotationAwardFlowModal
        open
        onClose={vi.fn()}
        workspaceId="w1"
        rfqLineItemId="line-1"
        productTitle="Pasta"
        quotation={quotation}
        unitPrice={2}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByTestId("quotation-award-select-modal")).toBeInTheDocument();
    expect(screen.queryByTestId("quotation-award-close-modal")).toBeNull();
    expect(screen.getByText(/Pasta/)).toBeInTheDocument();
  });

  it("lists variation breakdown for multi-variation quotations", () => {
    const multi: QuotationRowDTO = {
      ...quotation,
      lineItems: [
        { id: "li-1", position: 1, description: "500 ml", quantity: 1, unitPrice: 2.1, total: 2.1, priceUnit: "Piece" },
        { id: "li-2", position: 2, description: "1 L", quantity: 1, unitPrice: 3.85, total: 3.85, priceUnit: "Piece" },
      ],
    };
    renderWithProviders(
      <QuotationAwardFlowModal
        open
        onClose={vi.fn()}
        workspaceId="w1"
        rfqLineItemId="line-1"
        quotation={multi}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByTestId("quotation-award-variations")).toBeInTheDocument();
    expect(screen.getByText(/500 ml/)).toBeInTheDocument();
    expect(screen.getByText(/1 L/)).toBeInTheDocument();
  });

  it("calls award_line_item with rfqLineItemId and rationale", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <QuotationAwardFlowModal
        open
        onClose={onClose}
        workspaceId="w1"
        rfqLineItemId="line-pasta"
        quotation={quotation}
        unitPrice={2}
        onSuccess={onSuccess}
      />,
    );

    const textarea = screen.getByTestId("quotation-award-rationale");
    await user.type(textarea, "En uygun fiyat ve termin süresi.");
    await user.click(screen.getByTestId("quotation-award-select-confirm"));

    await waitFor(() => {
      expect(rfqApi.action).toHaveBeenCalledTimes(1);
      expect(rfqApi.action).toHaveBeenCalledWith("w1", "award_line_item", {
        payload: {
          rfqLineItemId: "line-pasta",
          quotationId: "q1",
          rationale: "En uygun fiyat ve termin süresi.",
        },
      });
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
