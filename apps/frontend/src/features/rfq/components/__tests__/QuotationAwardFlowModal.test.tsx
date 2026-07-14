import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("shows close-quotations step first when RFQ is open", () => {
    renderWithProviders(
      <QuotationAwardFlowModal
        open
        onClose={vi.fn()}
        workspaceId="w1"
        state="RFQ_OPEN"
        quotation={quotation}
        unitPrice={2}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByTestId("quotation-award-close-modal")).toBeInTheDocument();
    expect(screen.getByText(/Teklifleri kapatıp devam edelim mi/i)).toBeInTheDocument();
    expect(screen.getByText("deneme")).toBeInTheDocument();
  });

  it("advances to supplier selection after confirming close step", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <QuotationAwardFlowModal
        open
        onClose={vi.fn()}
        workspaceId="w1"
        state="RFQ_OPEN"
        quotation={quotation}
        unitPrice={2}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("quotation-award-close-confirm"));

    expect(screen.getByTestId("quotation-award-select-modal")).toBeInTheDocument();
    expect(screen.getByTestId("quotation-award-rationale")).toBeInTheDocument();
    expect(rfqApi.action).not.toHaveBeenCalled();
  });

  it("skips close step and runs select flow directly in UNDER_EVALUATION", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <QuotationAwardFlowModal
        open
        onClose={onClose}
        workspaceId="w1"
        state="UNDER_EVALUATION"
        quotation={quotation}
        unitPrice={2}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.queryByTestId("quotation-award-close-modal")).toBeNull();
    expect(screen.getByTestId("quotation-award-select-modal")).toBeInTheDocument();

    const textarea = screen.getByTestId("quotation-award-rationale");
    await user.type(textarea, "En uygun fiyat ve termin süresi.");
    await user.click(screen.getByTestId("quotation-award-select-confirm"));

    await waitFor(() => {
      expect(rfqApi.action).toHaveBeenCalledTimes(1);
      expect(rfqApi.action).toHaveBeenCalledWith("w1", "select_supplier", {
        payload: {
          quotationId: "q1",
          supplierUserId: "s1",
          rationale: "En uygun fiyat ve termin süresi.",
        },
      });
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("runs close, evaluation, and select actions from RFQ_OPEN", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <QuotationAwardFlowModal
        open
        onClose={vi.fn()}
        workspaceId="w1"
        state="RFQ_OPEN"
        quotation={quotation}
        unitPrice={2}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("quotation-award-close-confirm"));
    fireEvent.change(screen.getByTestId("quotation-award-rationale"), {
      target: { value: "Fiyat avantajı ve güvenilir üretici." },
    });
    await user.click(screen.getByTestId("quotation-award-select-confirm"));

    await waitFor(() => {
      expect(rfqApi.action).toHaveBeenCalledTimes(3);
      expect(rfqApi.action).toHaveBeenNthCalledWith(1, "w1", "close_quotations_early");
      expect(rfqApi.action).toHaveBeenNthCalledWith(2, "w1", "start_evaluation");
      expect(rfqApi.action).toHaveBeenNthCalledWith(3, "w1", "select_supplier", {
        payload: {
          quotationId: "q1",
          supplierUserId: "s1",
          rationale: "Fiyat avantajı ve güvenilir üretici.",
        },
      });
    });
  });
});
