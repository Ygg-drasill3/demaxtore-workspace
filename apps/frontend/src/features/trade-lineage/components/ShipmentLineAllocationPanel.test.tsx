import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { ShipmentLineAllocationPanel } from "./ShipmentLineAllocationPanel";

vi.mock("../lib/trade-lineage.api", () => ({
  tradeLineageApi: {
    forShipment: vi.fn(async () => ({
      purchaseOrders: [{ id: "po-1", poNumber: "PO-1", status: "SUBMITTED", orderId: "ord-1" }],
      poLines: [
        {
          id: "line-1",
          purchaseOrderId: "po-1",
          sku: "FLOUR-1",
          description: "Flour",
          orderedQuantity: 100,
          allocatedQuantity: 0,
          remainingQuantity: 100,
        },
      ],
      bookings: [],
      shipments: [],
      containers: [],
      allocations: [],
    })),
    upsertAllocation: vi.fn(),
  },
}));

vi.mock("@/store/toast.store", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function wrap(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ShipmentLineAllocationPanel", () => {
  it("shows PO lines without requiring UUID entry", async () => {
    wrap(<ShipmentLineAllocationPanel shipmentId="ship-1" canMutate />);
    expect(await screen.findByTestId("allocation-po-PO-1")).toBeInTheDocument();
    expect(screen.getByTestId("allocation-line-FLOUR-1")).toHaveTextContent("Flour");
    expect(screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("allocation-qty-line-1")).toBeInTheDocument();
  });

  it("hides mutation controls for read-only roles", async () => {
    wrap(<ShipmentLineAllocationPanel shipmentId="ship-1" canMutate={false} />);
    expect(await screen.findByTestId("allocation-line-FLOUR-1")).toBeInTheDocument();
    expect(screen.queryByTestId("allocation-qty-line-1")).not.toBeInTheDocument();
  });
});
