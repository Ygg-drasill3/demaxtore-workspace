// apps/frontend/src/features/rfq/components/__tests__/RfqProgressBar.test.tsx
//
// Sprint 2.5 — buyer-readable storyline + sub-state pill.
//
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RfqProgressBar } from "../RfqProgressBar";

describe("<RfqProgressBar />", () => {
  it("renders 7 storyline steps for live RFQ_OPEN", () => {
    render(<RfqProgressBar state="RFQ_OPEN" meta={{ invited: 5, quoted: 2 }} />);
    expect(screen.getByTestId("rfq-progress-bar")).toBeInTheDocument();
    expect(screen.getByTestId("storyline-draft")).toBeInTheDocument();
    expect(screen.getByTestId("storyline-order")).toBeInTheDocument();
  });

  it("highlights the 'collecting' step for RFQ_OPEN as current", () => {
    render(<RfqProgressBar state="RFQ_OPEN" meta={{ invited: 5, quoted: 2 }} />);
    expect(screen.getByTestId("storyline-collect")).toHaveAttribute("data-state", "current");
    expect(screen.getByTestId("storyline-evaluate")).toHaveAttribute("data-state", "upcoming");
  });

  it("renders the sub-state pill 'X of Y quotations submitted' in RFQ_OPEN", () => {
    render(<RfqProgressBar state="RFQ_OPEN" meta={{ invited: 5, quoted: 2 }} />);
    expect(screen.getByTestId("storyline-sub-pill")).toHaveTextContent(/2 of 5 quotations submitted/i);
  });

  it("renders humanised banner for CANCELLED with reason", () => {
    render(<RfqProgressBar state="CANCELLED" meta={{ terminalReason: "Specs changed" }} />);
    expect(screen.getByTestId("rfq-progress-bar-closed")).toHaveTextContent(/cancelled/i);
    expect(screen.getByTestId("rfq-progress-bar-closed")).toHaveTextContent(/specs changed/i);
  });

  it("renders banner for EXPIRED", () => {
    render(<RfqProgressBar state="EXPIRED" />);
    expect(screen.getByTestId("rfq-progress-bar-closed")).toHaveTextContent(/no supplier quoted/i);
  });
});
