import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import type { PartnerInlandDeliverySummaryDto } from "@dmx/contracts/partner-workspace";
import { MyDeliveriesQueue } from "./MyDeliveriesQueue";

const DELIVERY_ID = "fd145bfb-0e8b-485a-a13b-131ecf7cd9a6";
const OTHER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function sample(overrides: Partial<PartnerInlandDeliverySummaryDto> = {}): PartnerInlandDeliverySummaryDto {
  return {
    inlandDeliveryId: DELIVERY_ID,
    shipmentWorkspaceId: "e642249e-ea25-477c-a8e8-48c5344d0c3b",
    shipmentRef: "SHP-UI17C-DEMO",
    containerNumber: "MSKU17CDEMO",
    pickupLocation: "Terminal TRIST",
    deliveryCity: "Istanbul",
    pickupAt: null,
    status: "TRUCKER_ASSIGNED",
    nextAction: "Schedule pickup",
    queueGroup: "ACTION_REQUIRED",
    ...overrides,
  };
}

function wrap(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("MyDeliveriesQueue", () => {
  it("renders assigned delivery as clickable Open Delivery without showing UUID as the title", () => {
    wrap(<MyDeliveriesQueue deliveries={[sample()]} />);
    expect(screen.getByTestId("my-deliveries")).toBeInTheDocument();
    expect(screen.getByTestId("inland-delivery-title")).toHaveTextContent("SHP-UI17C-DEMO");
    expect(screen.getByTestId("inland-delivery-title")).not.toHaveTextContent(DELIVERY_ID);
    const link = screen.getByTestId("open-inland-delivery-SHP-UI17C-DEMO");
    expect(link).toHaveAttribute("href", `/partner/inland/${DELIVERY_ID}`);
    expect(link).toHaveTextContent("Open Delivery");
    expect(screen.getByText(/Schedule pickup/)).toBeInTheDocument();
    expect(screen.getByText(/MSKU17CDEMO/)).toBeInTheDocument();
    expect(screen.getByText(/Istanbul/)).toBeInTheDocument();
  });

  it("does not render an unassigned delivery that was never passed in", () => {
    wrap(<MyDeliveriesQueue deliveries={[sample()]} />);
    expect(screen.queryByTestId(`open-inland-delivery-${OTHER_ID}`)).not.toBeInTheDocument();
    expect(screen.queryByText(OTHER_ID)).not.toBeInTheDocument();
  });

  it("shows empty state when trucker has no assigned deliveries", () => {
    wrap(<MyDeliveriesQueue deliveries={[]} />);
    expect(screen.getByTestId("my-deliveries-empty")).toHaveTextContent(
      "No assigned inland deliveries yet.",
    );
    expect(screen.queryByText("Open Delivery")).not.toBeInTheDocument();
  });
});
