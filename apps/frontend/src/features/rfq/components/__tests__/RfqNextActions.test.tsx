// apps/frontend/src/features/rfq/components/__tests__/RfqNextActions.test.tsx
//
// Secondary RFQ actions render inline below the hero card.
//
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { RfqNextActions } from "../RfqNextActions";

vi.mock("../../hooks", () => ({
  useApplyRfqAction: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, variables: null }),
}));

describe("<RfqNextActions /> — inline actions", () => {
  it("renders inline secondary actions for BUYER@RFQ_DRAFT", () => {
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="RFQ_DRAFT"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    expect(screen.getByTestId("rfq-next-actions")).toBeInTheDocument();
    expect(screen.getByTestId("action-tile-edit_rfq_draft")).toBeInTheDocument();
    expect(screen.getByTestId("action-tile-cancel_rfq")).toBeInTheDocument();
    expect(screen.queryByTestId("action-tile-submit_rfq")).toBeNull();
  });

  it("excludes promoted hero actions for BUYER@RFQ_OPEN", () => {
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="RFQ_OPEN"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    expect(screen.queryByTestId("action-tile-close_quotations_early")).toBeNull();
    expect(screen.queryByTestId("action-tile-post_clarification")).toBeNull();
  });

  it("renders nothing when hero card already covers all actions", () => {
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="PARTIALLY_AWARDED"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    expect(screen.queryByTestId("rfq-next-actions")).toBeNull();
  });

  it("opens reason modal when a destructive inline action is clicked", () => {
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="RFQ_DRAFT"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    fireEvent.click(screen.getByTestId("action-tile-cancel_rfq"));
    expect(screen.getByTestId("action-drawer-reason-modal")).toBeInTheDocument();
  });

  it("renders nothing when state is terminal (no allowed actions)", () => {
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="CANCELLED"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    expect(screen.queryByTestId("rfq-next-actions")).toBeNull();
  });
});
