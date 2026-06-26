// apps/frontend/src/features/rfq/components/__tests__/RfqStateBadge.test.tsx
//
// Sprint 2.5 — uses buyer-readable labels (no FSM language).
//
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RfqStateBadge } from "../RfqStateBadge";

describe("<RfqStateBadge />", () => {
  it("renders the buyer-readable label for RFQ_OPEN", () => {
    render(<RfqStateBadge state="RFQ_OPEN" />);
    expect(screen.getByTestId("rfq-state-badge-RFQ_OPEN"))
      .toHaveTextContent(/waiting for supplier quotations/i);
  });

  it("renders RFQ_SUBMITTED with 'Under review by DeMaxtore'", () => {
    render(<RfqStateBadge state="RFQ_SUBMITTED" />);
    expect(screen.getByTestId("rfq-state-badge-RFQ_SUBMITTED"))
      .toHaveTextContent(/under review by demaxtore/i);
  });

  it("falls back to the raw state for an unknown one", () => {
    render(<RfqStateBadge state="UNKNOWN_STATE" />);
    expect(screen.getByTestId("rfq-state-badge-UNKNOWN_STATE"))
      .toHaveTextContent(/UNKNOWN_STATE/);
  });

  it("CANCELLED renders the 'Cancelled' label", () => {
    render(<RfqStateBadge state="CANCELLED" />);
    expect(screen.getByTestId("rfq-state-badge-CANCELLED"))
      .toHaveTextContent(/cancelled/i);
  });
});
