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
});
