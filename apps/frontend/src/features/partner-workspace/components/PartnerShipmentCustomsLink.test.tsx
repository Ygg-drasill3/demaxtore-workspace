import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { PartnerShipmentCustomsLink } from "./PartnerShipmentCustomsLink";

const eligibilityMock = vi.fn();

vi.mock("@/features/customs/lib/customs.api", () => ({
  customsApi: {
    eligibility: (...args: unknown[]) => eligibilityMock(...args),
  },
}));

describe("PartnerShipmentCustomsLink", () => {
  beforeEach(() => eligibilityMock.mockReset());

  it("links assigned broker from shipment to existing partner customs route", async () => {
    eligibilityMock.mockResolvedValue({
      eligible: true,
      destinationCountryCode: "TR",
      customsCaseId: "case-abc",
      status: "DRAFT",
      readinessStatus: "NOT_READY",
    });
    renderWithProviders(
      <PartnerShipmentCustomsLink workspaceId="shp-1" partnerRole="CUSTOMS_BROKER" />,
    );
    expect(await screen.findByTestId("partner-open-customs-case")).toHaveAttribute(
      "href",
      "/partner/customs/case-abc",
    );
  });

  it("does not query or render for origin agent", async () => {
    renderWithProviders(
      <PartnerShipmentCustomsLink workspaceId="shp-1" partnerRole="ORIGIN_AGENT" />,
    );
    await waitFor(() => expect(eligibilityMock).not.toHaveBeenCalled());
    expect(screen.queryByTestId("partner-open-customs-case")).not.toBeInTheDocument();
  });

  it("does not query or render for trucker", async () => {
    renderWithProviders(
      <PartnerShipmentCustomsLink workspaceId="shp-1" partnerRole="TRUCKER" />,
    );
    await waitFor(() => expect(eligibilityMock).not.toHaveBeenCalled());
    expect(screen.queryByTestId("partner-open-customs-case")).not.toBeInTheDocument();
  });
});
