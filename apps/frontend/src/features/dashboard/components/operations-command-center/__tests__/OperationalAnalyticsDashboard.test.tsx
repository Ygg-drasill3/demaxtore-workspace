import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, makeTestQueryClient } from "@/test/utils";
import { OperationalAnalyticsDashboard } from "../OperationalAnalyticsDashboard";
import type { OperationalAnalyticsSummaryDto } from "@dmx/contracts/operational-analytics";

const summary: OperationalAnalyticsSummaryDto = {
  range: {
    preset: "LAST_30_DAYS",
    from: "2026-06-29T00:00:00.000Z",
    to: "2026-07-29T00:00:00.000Z",
  },
  generatedAt: new Date().toISOString(),
  cached: false,
  orders: { openOrders: 5, completedOrders: 2, averageCompletionHours: 48 },
  shipments: {
    activeShipments: 3,
    delayedShipments: 1,
    onTimeDeliveryPct: 80,
    averageDelayHours: 12,
  },
  inspections: { requested: 4, passed: 3, failed: 1, passRatePct: 75 },
  tasks: { open: 6, overdue: 1, completedToday: 2, averageResolutionHours: 8 },
  issues: { open: 2, critical: 1, resolvedToday: 0, averageResolutionHours: 10 },
  completion: { ready: 1, completedToday: 1, completionRatePct: 50 },
  trends: [
    { key: "open_orders", label: "Open orders", value: 5, previousValue: 4, deltaPct: 25 },
  ],
  permissions: { canView: true, canViewSuppliers: true, canExport: true },
};

describe("<OperationalAnalyticsDashboard />", () => {
  it("renders filters, overview KPIs and export controls", async () => {
    const client = makeTestQueryClient();
    client.setQueryData(["analytics", "summary", { preset: "LAST_30_DAYS" }], summary);
    client.setQueryData(["analytics", "suppliers", { preset: "LAST_30_DAYS" }], {
      range: summary.range,
      items: [
        {
          supplierUserId: "s1",
          supplierName: "Acme Foods",
          openOrders: 2,
          completedOrders: 1,
          inspectionPassPct: 100,
          shipmentDelayPct: 0,
          averageLeadTimeDays: 14,
          averageCompletionHours: 72,
        },
      ],
    });

    renderWithProviders(<OperationalAnalyticsDashboard />, { client });

    expect(await screen.findByTestId("ops-analytics-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("ops-analytics-preset")).toBeInTheDocument();
    expect(screen.getByTestId("ops-analytics-overview")).toBeInTheDocument();
    expect(screen.getByTestId("ops-analytics-export-csv")).toBeInTheDocument();
    expect(screen.getByText("Acme Foods")).toBeInTheDocument();
  });
});
