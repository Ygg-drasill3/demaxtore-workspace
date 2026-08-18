import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { PartnerShipmentInlandLink } from "./PartnerShipmentInlandLink";

const byShipmentMock = vi.fn();

vi.mock("@/features/inland/lib/inland.api", () => ({
  inlandApi: {
    byShipment: (...args: unknown[]) => byShipmentMock(...args),
  },
}));

describe("PartnerShipmentInlandLink", () => {
  beforeEach(() => byShipmentMock.mockReset());

  it("links assigned trucker from shipment to existing partner inland route", async () => {
    byShipmentMock.mockResolvedValue({
      id: "inland-abc",
      status: "TRUCKER_ASSIGNED",
      deliveryCity: "Istanbul",
      nextAction: "Schedule pickup",
    });
    renderWithProviders(
      <PartnerShipmentInlandLink workspaceId="shp-1" partnerRole="TRUCKER" />,
    );
    expect(await screen.findByTestId("partner-open-inland-delivery")).toHaveAttribute(
      "href",
      "/partner/inland/inland-abc",
    );
  });

  it("does not query or render for origin agent", async () => {
    renderWithProviders(
      <PartnerShipmentInlandLink workspaceId="shp-1" partnerRole="ORIGIN_AGENT" />,
    );
    await waitFor(() => expect(byShipmentMock).not.toHaveBeenCalled());
    expect(screen.queryByTestId("partner-open-inland-delivery")).not.toBeInTheDocument();
  });

  it("does not query or render for customs broker", async () => {
    renderWithProviders(
      <PartnerShipmentInlandLink workspaceId="shp-1" partnerRole="CUSTOMS_BROKER" />,
    );
    await waitFor(() => expect(byShipmentMock).not.toHaveBeenCalled());
    expect(screen.queryByTestId("partner-open-inland-delivery")).not.toBeInTheDocument();
  });
});
