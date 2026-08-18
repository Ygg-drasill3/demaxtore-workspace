// apps/frontend/src/features/dashboard/pages/__tests__/BuyerDashboardPage.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import BuyerDashboardPage from "../BuyerDashboardPage";
import { useAuth } from "@/store/auth.store";
import type { UserDTO } from "@dmx/contracts/auth";

vi.mock("../../hooks/useBuyerCommandCenter", () => ({
  useBuyerCommandCenter: () => ({
    isLoading: false,
    data: {
      mode: "standard",
      kpis: { openRfqs: 2, liveAuctions: 1, activeOrders: 3, shipmentsInTransit: 0, unreadMessages: 0, pendingActions: 0 },
      requiredActions: [],
      activeTrades: [],
      liveAuctions: [],
      shipments: [],
      documents: [],
      communications: [],
      upcomingEvents: [],
    },
  }),
}));

vi.mock("../../hooks/useBuyerDashboardQuick", () => ({
  useBuyerDashboardQuick: () => ({
    isLoading: false,
    data: undefined,
  }),
}));

function setBuyer(patch: Partial<UserDTO> = {}) {
  useAuth.setState({
    user: {
      id: "u-1",
      email: "buyer@x.io",
      displayName: "Buyer One",
      role: "BUYER",
      organisation: "Acme",
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      ...patch,
    },
    accessToken: "t",
    status: "authenticated",
  });
}

beforeEach(() => {
  setBuyer();
});

describe("<BuyerDashboardPage />", () => {
  it("defaults missing operating model to International sourcing hero", async () => {
    renderWithProviders(<BuyerDashboardPage />, { route: "/buyer/dashboard" });
    await waitFor(() => {
      expect(screen.getByTestId("buyer-dashboard")).toHaveAttribute("data-buyer-operating-model", "INTERNATIONAL");
      expect(screen.getByTestId("buyer-dashboard-hero")).toHaveAttribute("data-hero-variant", "international");
      expect(screen.getByTestId("buyer-create-cb")).toBeInTheDocument();
      expect(screen.getByTestId("buyer-create-rfq")).toBeInTheDocument();
      expect(screen.getByTestId("cc-kpi-row")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("buyer-get-freight-quote")).not.toBeInTheDocument();
    expect(screen.queryByTestId("buyer-start-import")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cc-import-kpi-row")).not.toBeInTheDocument();
  });

  it("does not show Turkey commercial hero copy for International buyers", () => {
    renderWithProviders(<BuyerDashboardPage />, { route: "/buyer/dashboard" });
    const subtitle = screen.getByTestId("buyer-hero-subtitle");
    expect(subtitle).not.toHaveTextContent(/manage freight, customs/i);
    expect(subtitle).not.toHaveTextContent("s43.hero.subtitle");
    expect(screen.queryByText(/import operating system/i)).not.toBeInTheDocument();
  });

  it("restores International onboarding (RFQ → award → PO)", async () => {
    renderWithProviders(<BuyerDashboardPage />, { route: "/buyer/dashboard" });
    const toggle = screen.getByTestId("cc-onboarding-toggle");
    expect(toggle).toHaveTextContent(/sourcing command center|first import trade|guided checklist/i);
    toggle.click();
    const welcome = await screen.findByTestId("buyer-onboarding-welcome");
    expect(welcome).toHaveTextContent(/sourcing command center/i);
    expect(welcome).toHaveTextContent(/Create RFQ/i);
    expect(welcome).not.toHaveTextContent(/freight and customs operations/i);
    expect(screen.getByTestId("buyer-onboarding-cta")).toHaveAttribute("href", "/buyer/rfq/new");
  });

  it("renders Turkey import-execution dashboard when operating model is TURKEY_IMPORTER", async () => {
    setBuyer({ buyerOperatingModel: "TURKEY_IMPORTER" });
    renderWithProviders(<BuyerDashboardPage />, { route: "/buyer/dashboard" });
    await waitFor(() => {
      expect(screen.getByTestId("buyer-dashboard")).toHaveAttribute("data-buyer-operating-model", "TURKEY_IMPORTER");
      expect(screen.getByTestId("cc-import-kpi-row")).toBeInTheDocument();
      expect(screen.getByTestId("buyer-get-freight-quote")).toBeInTheDocument();
      expect(screen.getByTestId("buyer-start-import")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("buyer-create-rfq")).not.toBeInTheDocument();
  });

  it("keeps Turkey onboarding on the freight → customs journey", async () => {
    setBuyer({ buyerOperatingModel: "TURKEY_IMPORTER" });
    renderWithProviders(<BuyerDashboardPage />, { route: "/buyer/dashboard" });
    const toggle = screen.getByTestId("cc-onboarding-toggle");
    expect(toggle).not.toHaveTextContent(/RFQ → award → PO/i);
    toggle.click();
    const welcome = await screen.findByTestId("buyer-onboarding-welcome");
    expect(welcome).toHaveTextContent(/freight and customs/i);
    expect(welcome).not.toHaveTextContent(/RFQ → award → PO/i);
    expect(welcome).not.toHaveTextContent(/sourcing command center/i);
    expect(screen.getByTestId("buyer-onboarding-cta")).toHaveAttribute("href", "/buyer/imports/new");
  });

  it("greets the signed-in buyer by first name", () => {
    renderWithProviders(<BuyerDashboardPage />, { route: "/buyer/dashboard" });
    expect(screen.getByText(/hello, buyer\./i)).toBeInTheDocument();
  });
});
