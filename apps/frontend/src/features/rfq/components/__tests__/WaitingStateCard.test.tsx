// apps/frontend/src/features/rfq/components/__tests__/WaitingStateCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WaitingStateCard } from "../WaitingStateCard";

describe("<WaitingStateCard />", () => {
  it("renders the 4 canonical sections for RFQ_SUBMITTED", () => {
    render(<WaitingStateCard state="RFQ_SUBMITTED" vars={{ slaDeadline: "Mar 13 18:00" }} />);
    expect(screen.getByTestId("waiting-now")).toHaveTextContent(/in DeMaxtore's review queue/i);
    expect(screen.getByTestId("waiting-who")).toHaveTextContent(/operations team/i);
    expect(screen.getByTestId("waiting-expect")).toHaveTextContent(/notification when suppliers are assigned/i);
    expect(screen.getByTestId("waiting-when")).toHaveTextContent(/Mar 13 18:00/);
  });

  it("renders nothing for non-waiting states like RFQ_DRAFT", () => {
    const { container } = render(<WaitingStateCard state="RFQ_DRAFT" vars={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("substitutes template variables in PROFORMA_REQUESTED", () => {
    render(
      <WaitingStateCard
        state="PROFORMA_REQUESTED"
        vars={{ selectedSupplier: "Acme Trading", currency: "USD", lockedAmount: "48,000", proformaSlaDays: 3 }}
      />,
    );
    expect(screen.getByTestId("waiting-now")).toHaveTextContent(/Acme Trading/);
    expect(screen.getByTestId("waiting-who")).toHaveTextContent(/USD 48,000/);
    expect(screen.getByTestId("waiting-when")).toHaveTextContent(/3 business days remaining/);
  });
});
