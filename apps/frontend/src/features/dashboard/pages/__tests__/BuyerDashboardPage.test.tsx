// apps/frontend/src/features/dashboard/pages/__tests__/BuyerDashboardPage.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import BuyerDashboardPage from "../BuyerDashboardPage";
import { useAuth } from "@/store/auth.store";

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

beforeEach(() => {
  useAuth.setState({
    user: {
      id: "u-1", email: "buyer@x.io", displayName: "Buyer One",
      role: "BUYER", organisation: "Acme", avatarUrl: null,
      createdAt: new Date().toISOString(),
    },
    accessToken: "t", status: "authenticated",
  });
});

describe("<BuyerDashboardPage />", () => {
  it("renders command center KPI row", async () => {
    renderWithProviders(<BuyerDashboardPage />, { route: "/buyer/dashboard" });
    await waitFor(() => {
      expect(screen.getByTestId("cc-kpi-row")).toBeInTheDocument();
      expect(screen.getByTestId("cc-kpi-open-rfqs")).toBeInTheDocument();
      expect(screen.getByTestId("cc-action-inbox")).toBeInTheDocument();
      expect(screen.getByTestId("cc-active-trades")).toBeInTheDocument();
    });
  });

  it("greets the signed-in buyer by first name", () => {
    renderWithProviders(<BuyerDashboardPage />, { route: "/buyer/dashboard" });
    expect(screen.getByText(/hello, buyer\./i)).toBeInTheDocument();
  });
});
