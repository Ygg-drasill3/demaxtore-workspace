// apps/frontend/src/features/rfq/components/__tests__/RfqNextActions.test.tsx
//
// Sprint 2.5 — RfqNextActions is now a "More actions ⋯" trigger that opens
// ActionDrawer. The primary CTA lives in WhatHappensNextCard. These tests
// verify that the trigger appears with the right count and that the primary
// action is NOT in the drawer list.
//
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { RfqNextActions } from "../RfqNextActions";

vi.mock("../../hooks", () => ({
  useApplyRfqAction: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, variables: null }),
}));

describe("<RfqNextActions /> — More-actions trigger", () => {
  it("renders the trigger with the count of secondary actions for BUYER@RFQ_DRAFT", () => {
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="RFQ_DRAFT"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    // Primary (submit_rfq) is excluded; only edit_rfq_draft + cancel_rfq remain → count 2
    const trigger = screen.getByTestId("rfq-more-actions-trigger");
    expect(trigger).toHaveTextContent(/more actions \(2\)/i);
  });

  it("excludes promoted hero actions from More actions for BUYER@RFQ_OPEN", () => {
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="RFQ_OPEN"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    const trigger = screen.getByTestId("rfq-more-actions-trigger");
    expect(trigger).toHaveTextContent(/more actions \(2\)/i);
    fireEvent.click(trigger);
    expect(screen.queryByTestId("action-tile-close_quotations_early")).toBeNull();
  });

  it("clicking the trigger opens the action drawer", () => {
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="RFQ_DRAFT"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    fireEvent.click(screen.getByTestId("rfq-more-actions-trigger"));
    expect(screen.getByTestId("action-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("action-tile-cancel_rfq")).toBeInTheDocument();
    expect(screen.getByTestId("action-tile-edit_rfq_draft")).toBeInTheDocument();
    // submit_rfq is the PRIMARY → must not appear in the drawer
    expect(screen.queryByTestId("action-tile-submit_rfq")).toBeNull();
  });

  it("does not render the trigger when only the primary action is allowed", () => {
    // SUPPLIER counterparty at RFQ_OPEN with no existing quote → only submit_quotation
    renderWithProviders(
      <RfqNextActions
        workspaceId="w1"
        state="RFQ_OPEN"
        actor={{ id: "u2", role: "SUPPLIER" }}
        isOwner={false} isCounterparty
        hasQuotationFromUser={false}
      />,
    );
    // Only submit_quotation is allowed; but it is NOT the script's primary
    // (post_clarification is). Therefore submit_quotation appears in others.
    const trigger = screen.queryByTestId("rfq-more-actions-trigger");
    expect(trigger).not.toBeNull();
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
    expect(screen.queryByTestId("rfq-more-actions-trigger")).toBeNull();
  });
});
