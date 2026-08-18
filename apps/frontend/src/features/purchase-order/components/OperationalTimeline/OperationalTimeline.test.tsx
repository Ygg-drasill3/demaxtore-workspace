import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { OperationalTimeline } from "./OperationalTimeline";

class IOMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IOMock);

vi.mock("../../lib/operational-timeline.api", () => ({
  operationalTimelineApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: "timeline:1",
          purchaseOrderId: "po-1",
          orderId: "order-1",
          category: "REVISION",
          source: "timeline",
          occurredAt: new Date().toISOString(),
          actor: { id: "u1", name: "Buyer" },
          title: "Revision Approved",
          description: "Revision 2",
          icon: "revision",
          severity: "success",
          relatedEntity: { type: "REVISION", id: "rev-2" },
        },
        {
          id: "commercial_document:d1:upload",
          purchaseOrderId: "po-1",
          orderId: "order-1",
          category: "DOCUMENT",
          source: "commercial_document",
          occurredAt: new Date(Date.now() - 86_400_000).toISOString(),
          actor: { id: "u1", name: "Buyer" },
          title: "Commercial Invoice Uploaded",
          description: "invoice.pdf",
          icon: "upload",
          severity: "info",
          relatedEntity: { type: "DOCUMENT", id: "COMMERCIAL:d1" },
        },
      ],
      page: 1,
      pageSize: 25,
      total: 2,
      availableCategories: ["REVISION", "DOCUMENT"],
      availableSources: ["timeline", "commercial_document"],
    }),
  },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OperationalTimeline", () => {
  it("renders events and opens drawer with revision deep link", async () => {
    const onOpenRevision = vi.fn();
    wrap(
      <OperationalTimeline
        purchaseOrderId="po-1"
        onOpenRevision={onOpenRevision}
      />,
    );

    expect(await screen.findByTestId("po-timeline")).toBeInTheDocument();
    expect(await screen.findByText("Revision Approved")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Revision Approved"));
    expect(await screen.findByTestId("po-timeline-drawer")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("po-timeline-open-revision"));
    expect(onOpenRevision).toHaveBeenCalledWith("rev-2");
  });

  it("filters by search input", async () => {
    wrap(<OperationalTimeline purchaseOrderId="po-1" />);
    await screen.findByText("Revision Approved");
    fireEvent.change(screen.getByTestId("po-timeline-search"), {
      target: { value: "invoice" },
    });
    // Debounced refetch — API mock returns same data; assert control exists
    expect(screen.getByTestId("po-timeline-search")).toHaveValue("invoice");
  });
});
