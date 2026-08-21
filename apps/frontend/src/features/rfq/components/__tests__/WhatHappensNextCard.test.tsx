// apps/frontend/src/features/rfq/components/__tests__/WhatHappensNextCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { WhatHappensNextCard } from "../WhatHappensNextCard";

vi.mock("../../hooks", () => ({
  useApplyRfqAction: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
}));

const baseProps = {
  workspaceId: "w1",
  actor: { id: "u1", role: "BUYER" as const },
  isOwner: true,
  isCounterparty: false,
};

describe("<WhatHappensNextCard />", () => {
  it("renders the canonical past + future copy for RFQ_DRAFT", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="RFQ_DRAFT"
        vars={{ currency: "USD", estimatedValue: "50,000" }}
      />,
    );
    expect(screen.getByTestId("whn-past")).toHaveTextContent(/draft created/i);
    expect(screen.getByTestId("whn-future")).toHaveTextContent(/need to submit/i);
    expect(screen.getByTestId("whn-stat-right")).toHaveTextContent(/USD 50,000/);
  });

  it("renders the primary CTA inside the card for BUYER owner @ RFQ_DRAFT", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="RFQ_DRAFT"
        vars={{ estimatedValue: "—", currency: "USD" }}
      />,
    );
    const cta = screen.getByTestId("whn-primary-cta-submit_rfq");
    expect(cta).toHaveTextContent(/submit rfq/i);
  });

  it("renders no primary CTA in waiting states (RFQ_SUBMITTED)", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="RFQ_SUBMITTED"
        vars={{ queuePosition: 3 }}
      />,
    );
    expect(screen.queryByTestId("whn-primary-cta")).toBeNull();
    expect(screen.getByTestId("whn-future")).toHaveTextContent(/demaxtore is reviewing/i);
  });

  it("substitutes award progress variables for PARTIALLY_AWARDED", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="PARTIALLY_AWARDED"
        vars={{ awardedLines: 1, totalLines: 3, openLines: 2, awardedSuppliers: 1, posIssued: 0 }}
      />,
    );
    expect(screen.getByTestId("whn-past")).toHaveTextContent(/1 of 3 products awarded/i);
    expect(screen.getByTestId("whn-stat-left")).toHaveTextContent(/1\/3 lines/);
    expect(screen.getByTestId("whn-stat-right")).toHaveTextContent(/2 still open/);
    expect(screen.getByTestId("whn-primary-cta-issue_supplier_po")).toHaveTextContent(/issue po/i);
    expect(screen.getByTestId("whn-promoted-cta-close_rfq_awards")).toBeInTheDocument();
  });

  it("substitutes template variables", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="RFQ_OPEN"
        isCounterparty={false}
        vars={{ invited: 5, quoted: 2, deadlineCountdown: "2d 4h left" }}
      />,
    );
    expect(screen.getByTestId("whn-past")).toHaveTextContent(/published to 5 suppliers/i);
    expect(screen.getByTestId("whn-stat-left")).toHaveTextContent(/2d 4h left/);
    expect(screen.getByTestId("whn-stat-right")).toHaveTextContent(/2\/5 quotations/);
  });

  it("surfaces Close Quotations in the hero card for BUYER owner @ RFQ_OPEN", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="RFQ_OPEN"
        vars={{ invited: 5, quoted: 2, deadlineCountdown: "2d 4h left" }}
      />,
    );
    expect(screen.getByTestId("whn-promoted-cta-close_quotations_early")).toHaveTextContent(/close quotations/i);
  });

  it("falls back gracefully for unknown state", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state={"WEIRD_STATE" as any}
        vars={{}}
      />,
    );
    expect(screen.getByTestId("what-happens-next-fallback")).toBeInTheDocument();
  });

  it("data-mood attribute is set to the script's mood", () => {
    renderWithProviders(
      <WhatHappensNextCard {...baseProps} state="REJECTED_BY_ADMIN" vars={{}} />,
    );
    expect(screen.getByTestId("what-happens-next")).toHaveAttribute("data-mood", "returned");
  });

  it("hides order workspace fallback when orderId is missing @ CLOSED", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="CLOSED"
        vars={{ orderId: null }}
      />,
    );
    expect(screen.queryByTestId("whn-fallback-cta")).toBeNull();
    expect(screen.getByTestId("whn-past")).toHaveTextContent(/rfq closed/i);
  });

  it("shows order workspace fallback when orderId is present @ CLOSED", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="CLOSED"
        vars={{ orderId: "ord-123" }}
      />,
    );
    expect(screen.getByTestId("whn-fallback-cta")).toHaveTextContent(/open order/i);
  });

  it("shows open order alongside Issue PO when orderId is present @ PARTIALLY_AWARDED", () => {
    renderWithProviders(
      <WhatHappensNextCard
        {...baseProps}
        state="PARTIALLY_AWARDED"
        vars={{ orderId: "ord-123", awardedLines: 1, totalLines: 4, openLines: 3, awardedSuppliers: 1, posIssued: 1 }}
      />,
    );
    expect(screen.getByTestId("whn-primary-cta-issue_supplier_po")).toHaveTextContent(/issue po/i);
    expect(screen.getByTestId("whn-fallback-cta")).toHaveTextContent(/open order/i);
  });
});
