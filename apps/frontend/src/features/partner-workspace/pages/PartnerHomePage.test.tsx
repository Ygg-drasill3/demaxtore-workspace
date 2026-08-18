import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import PartnerHomePage from "./PartnerHomePage";
import { useAuth } from "@/store/auth.store";

const homeMock = vi.fn();

vi.mock("../lib/partner.api", () => ({
  partnerApi: {
    home: () => homeMock(),
  },
}));

const brokerUser = {
  id: "broker-1",
  email: "broker.smoke@demaxtore.local",
  displayName: "Broker Smoke",
  role: "CUSTOMS_BROKER" as const,
  organisation: null,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

describe("<PartnerHomePage /> My Customs Cases", () => {
  beforeEach(() => {
    homeMock.mockReset();
    useAuth.setState({
      user: brokerUser,
      accessToken: "t",
      status: "authenticated",
    });
  });

  it("shows assigned case and generates the partner customs route", async () => {
    homeMock.mockResolvedValue({
      partnerRole: "CUSTOMS_BROKER",
      tasksDueToday: 0,
      openTasks: 0,
      missingDocuments: 0,
      shipmentUpdates: 0,
      actionRequired: [],
      transactions: [],
      customsCases: [
        {
          customsCaseId: "case-uuid-1",
          shipmentWorkspaceId: "shp-1",
          shipmentRef: "SHP-UI17B-ASSIGNED",
          importerLabel: "PO-UI17B",
          eta: null,
          readinessStatus: "NOT_READY",
          customsStatus: "DRAFT",
          blockingIssues: 0,
          nextAction: "Start review",
          queueGroup: "READY_FOR_REVIEW",
          destinationPort: "TRIST",
        },
      ],
    });
    renderWithProviders(<PartnerHomePage />, { route: "/partner" });
    expect(await screen.findByTestId("my-customs-cases")).toBeInTheDocument();
    expect(screen.getByTestId("open-customs-case-SHP-UI17B-ASSIGNED")).toHaveAttribute(
      "href",
      "/partner/customs/case-uuid-1",
    );
    expect(screen.getByTestId("customs-case-title")).toHaveTextContent("SHP-UI17B-ASSIGNED");
    expect(screen.queryByText("case-uuid-1")).not.toBeInTheDocument();
  });

  it("hides My Deliveries for origin agent home payloads", async () => {
    useAuth.setState({
      user: { ...brokerUser, role: "ORIGIN_AGENT", displayName: "Origin Agent" },
      accessToken: "t",
      status: "authenticated",
    });
    homeMock.mockResolvedValue({
      partnerRole: "ORIGIN_AGENT",
      tasksDueToday: 0,
      openTasks: 0,
      missingDocuments: 0,
      shipmentUpdates: 0,
      actionRequired: [],
      transactions: [{ workspaceId: "shp-1", workspaceType: "SHIPMENT", externalRef: "SHP-1", state: "IN_TRANSIT", partnerRole: "ORIGIN_AGENT", openTaskCount: 0 }],
    });
    renderWithProviders(<PartnerHomePage />, { route: "/partner" });
    await waitFor(() => expect(screen.getByTestId("partner-home")).toBeInTheDocument());
    expect(screen.queryByTestId("my-deliveries")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Delivery")).not.toBeInTheDocument();
    expect(screen.queryByTestId("my-customs-cases")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Case")).not.toBeInTheDocument();
  });

  it("hides My Customs Cases for trucker home payloads and shows My Deliveries empty state", async () => {
    useAuth.setState({
      user: { ...brokerUser, role: "TRUCKER", displayName: "Trucker Smoke" },
      accessToken: "t",
      status: "authenticated",
    });
    homeMock.mockResolvedValue({
      partnerRole: "TRUCKER",
      tasksDueToday: 0,
      openTasks: 0,
      missingDocuments: 0,
      shipmentUpdates: 0,
      actionRequired: [],
      transactions: [],
      inlandDeliveries: [],
    });
    renderWithProviders(<PartnerHomePage />, { route: "/partner" });
    await waitFor(() => expect(screen.getByTestId("partner-home")).toBeInTheDocument());
    expect(screen.queryByTestId("my-customs-cases")).not.toBeInTheDocument();
    expect(await screen.findByTestId("my-deliveries-empty")).toBeInTheDocument();
  });

  it("shows assigned inland delivery and generates the partner inland route", async () => {
    useAuth.setState({
      user: { ...brokerUser, role: "TRUCKER", displayName: "Trucker Smoke" },
      accessToken: "t",
      status: "authenticated",
    });
    homeMock.mockResolvedValue({
      partnerRole: "TRUCKER",
      tasksDueToday: 0,
      openTasks: 0,
      missingDocuments: 0,
      shipmentUpdates: 0,
      actionRequired: [],
      transactions: [],
      inlandDeliveries: [
        {
          inlandDeliveryId: "inland-uuid-1",
          shipmentWorkspaceId: "shp-1",
          shipmentRef: "SHP-UI17C-ASSIGNED",
          containerNumber: "MSKU17C",
          pickupLocation: "TRIST",
          deliveryCity: "Istanbul",
          pickupAt: null,
          status: "TRUCKER_ASSIGNED",
          nextAction: "Schedule pickup",
          queueGroup: "ACTION_REQUIRED",
        },
      ],
    });
    renderWithProviders(<PartnerHomePage />, { route: "/partner" });
    expect(await screen.findByTestId("my-deliveries")).toBeInTheDocument();
    expect(screen.getByTestId("open-inland-delivery-SHP-UI17C-ASSIGNED")).toHaveAttribute(
      "href",
      "/partner/inland/inland-uuid-1",
    );
    expect(screen.getByTestId("inland-delivery-title")).toHaveTextContent("SHP-UI17C-ASSIGNED");
    expect(screen.queryByText("inland-uuid-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("my-customs-cases")).not.toBeInTheDocument();
  });

  it("shows empty state when broker has no assigned cases", async () => {
    homeMock.mockResolvedValue({
      partnerRole: "CUSTOMS_BROKER",
      tasksDueToday: 0,
      openTasks: 0,
      missingDocuments: 0,
      shipmentUpdates: 0,
      actionRequired: [],
      transactions: [],
      customsCases: [],
    });
    renderWithProviders(<PartnerHomePage />, { route: "/partner" });
    expect(await screen.findByTestId("my-customs-cases-empty")).toBeInTheDocument();
  });
});
