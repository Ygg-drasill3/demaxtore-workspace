import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import AdminReferenceFreightRatesPage from "../pages/AdminReferenceFreightRatesPage";
import { referenceFreightAdminApi } from "../lib/reference-freight.api";

vi.mock("../lib/reference-freight.api", () => ({
  referenceFreightAdminApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    audits: vi.fn(),
    copyMonth: vi.fn(),
    importCsv: vi.fn(),
    get: vi.fn(),
  },
}));

const mockList = vi.mocked(referenceFreightAdminApi.list);

describe("AdminReferenceFreightRatesPage", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockList.mockResolvedValue({
      items: [
        {
          id: "rate-1",
          originPort: "TRMER",
          destinationPort: "NGLOS",
          containerType: "20GP",
          referenceFreight: 2450,
          currency: "USD",
          validFrom: "2026-07-01T00:00:00.000Z",
          validUntil: "2026-07-31T23:59:59.999Z",
          status: "ACTIVE",
          lifecycleStatus: "EXPIRING_SOON",
          createdById: null,
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("renders table with lifecycle status badge", async () => {
    renderWithProviders(<AdminReferenceFreightRatesPage />);
    expect(await screen.findByTestId("reference-freight-admin-page")).toBeInTheDocument();
    expect(await screen.findByTestId("reference-freight-row-rate-1")).toBeInTheDocument();
    expect(screen.getByTestId("reference-freight-status-rate-1")).toHaveTextContent(/EXPIRING SOON/i);
    expect(screen.getByText("TRMER → NGLOS")).toBeInTheDocument();
  });
});
