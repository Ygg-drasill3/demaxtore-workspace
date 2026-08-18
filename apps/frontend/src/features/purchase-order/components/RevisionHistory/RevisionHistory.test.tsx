import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import type { PurchaseOrderRevision } from "@dmx/contracts/purchase-order";
import { RevisionHistory } from "./RevisionHistory";
import { RevisionSnapshot } from "./RevisionSnapshot";

vi.mock("@/components/ui/Drawer", () => ({
  Drawer: ({
    open,
    children,
    title,
    testId,
  }: {
    open: boolean;
    children: ReactNode;
    title?: string;
    testId?: string;
  }) =>
    open ? (
      <div data-testid={testId ?? "drawer"} role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

const revisions: PurchaseOrderRevision[] = [
  {
    id: "rev-2",
    purchaseOrderId: "po-1",
    revisionNumber: 2,
    createdById: "u1",
    createdBy: { id: "u1", name: "Jane Buyer" },
    reason: "Approved amendment",
    createdAt: "2026-07-28T12:00:00.000Z",
    isCurrent: true,
    snapshotJson: {
      header: { currency: "USD", paymentTerms: "Net 45", notes: "Updated" },
      lines: [{ sku: "S1", description: "Flour", quantity: 12, unitPrice: 2, lineTotal: 24 }],
    },
  },
  {
    id: "rev-1",
    purchaseOrderId: "po-1",
    revisionNumber: 1,
    createdById: "u1",
    createdBy: { id: "u1", name: "Jane Buyer" },
    reason: "Initial PO issuance",
    createdAt: "2026-07-27T10:00:00.000Z",
    isCurrent: false,
    snapshotJson: {
      header: { currency: "USD", paymentTerms: "Net 30", notes: "Initial" },
      lines: [{ sku: "S1", description: "Flour", quantity: 10, unitPrice: 2, lineTotal: 20 }],
    },
  },
];

describe("RevisionHistory", () => {
  it("renders list with current badge and actor", () => {
    render(
      <RevisionHistory purchaseOrderId="po-1" revisions={revisions} />,
    );
    expect(screen.getByTestId("po-revision-2")).toBeTruthy();
    expect(screen.getByTestId("po-revision-current-badge")).toBeTruthy();
    expect(screen.getByTestId("po-revision-actor-2").textContent).toContain("Jane Buyer");
  });

  it("shows empty state", () => {
    render(<RevisionHistory purchaseOrderId="po-1" revisions={[]} />);
    expect(screen.getByTestId("po-revision-history-empty").textContent).toMatch(/No revisions/);
  });

  it("shows error state with retry", () => {
    const onRetry = vi.fn();
    render(
      <RevisionHistory purchaseOrderId="po-1" revisions={[]} isError onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByTestId("po-revision-history-retry"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows loading skeleton", () => {
    render(<RevisionHistory purchaseOrderId="po-1" revisions={[]} isLoading />);
    expect(screen.getByTestId("po-revision-history-skeleton")).toBeTruthy();
  });

  it("opens drawer with snapshot from snapshotJson", async () => {
    render(<RevisionHistory purchaseOrderId="po-1" revisions={revisions} />);
    fireEvent.click(screen.getByTestId("po-revision-1"));
    expect(await screen.findByTestId("po-revision-drawer")).toBeTruthy();
    expect(await screen.findByTestId("po-revision-snapshot-commercial")).toBeTruthy();
  });

  it("opens comparison and highlights changes", async () => {
    render(<RevisionHistory purchaseOrderId="po-1" revisions={revisions} />);
    fireEvent.click(screen.getByTestId("po-revision-compare-select-1"));
    fireEvent.click(screen.getByTestId("po-revision-compare-select-2"));
    expect(await screen.findByTestId("po-revision-comparison")).toBeTruthy();
    expect(screen.getByTestId("po-revision-header-diff-paymentTerms")).toBeTruthy();
    expect(screen.getByTestId("po-revision-field-diff-quantity")).toBeTruthy();
  });
});

describe("RevisionSnapshot", () => {
  it("omits missing sections", () => {
    render(
      <RevisionSnapshot
        snapshotJson={{
          header: { currency: "EUR" },
          lines: [],
        }}
      />,
    );
    expect(screen.getByTestId("po-revision-snapshot-commercial")).toBeTruthy();
    expect(screen.queryByTestId("po-revision-snapshot-notes")).toBeNull();
    expect(screen.queryByTestId("po-revision-snapshot-products")).toBeNull();
  });
});
