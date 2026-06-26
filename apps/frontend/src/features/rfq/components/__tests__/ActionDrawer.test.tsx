// apps/frontend/src/features/rfq/components/__tests__/ActionDrawer.test.tsx
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { ActionDrawer } from "../ActionDrawer";

const mutateMock = vi.fn();
vi.mock("../../hooks", () => ({
  useApplyRfqAction: () => ({ mutate: mutateMock, isPending: false, variables: null }),
}));

describe("<ActionDrawer />", () => {
  it("excludes the script's primary action from the drawer", () => {
    renderWithProviders(
      <ActionDrawer
        workspaceId="w1"
        open
        onClose={() => {}}
        state="RFQ_DRAFT"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    // submit_rfq is the primary → must not appear here
    expect(screen.queryByTestId("action-tile-submit_rfq")).toBeNull();
    // Edit + Cancel are the other allowed actions
    expect(screen.getByTestId("action-tile-edit_rfq_draft")).toBeInTheDocument();
    expect(screen.getByTestId("action-tile-cancel_rfq")).toBeInTheDocument();
  });

  it("destructive actions appear under 'Critical' section", () => {
    renderWithProviders(
      <ActionDrawer
        workspaceId="w1"
        open
        onClose={() => {}}
        state="RFQ_OPEN"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    // cancel_rfq is destructive → renders in Critical group
    const drawer = screen.getByTestId("action-drawer");
    expect(drawer).toHaveTextContent(/critical/i);
    expect(screen.getByTestId("action-tile-cancel_rfq")).toBeInTheDocument();
  });

  it("clicking a reason-required action opens the reason modal with a disabled confirm", () => {
    renderWithProviders(
      <ActionDrawer
        workspaceId="w1"
        open
        onClose={() => {}}
        state="RFQ_DRAFT"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    fireEvent.click(screen.getByTestId("action-tile-cancel_rfq"));
    expect(screen.getByTestId("action-drawer-reason-modal")).toBeInTheDocument();
    expect(screen.getByTestId("action-drawer-reason-confirm")).toBeDisabled();

    // Typing a 15+ char reason enables Confirm
    const ta = screen.getByTestId("action-drawer-reason-textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "Switching specifications and re-issuing soon" } });
    expect(screen.getByTestId("action-drawer-reason-confirm")).not.toBeDisabled();
  });

  it("empty state copy when no actions are allowed (e.g. terminal state)", () => {
    renderWithProviders(
      <ActionDrawer
        workspaceId="w1"
        open
        onClose={() => {}}
        state="CANCELLED"
        actor={{ id: "u1", role: "BUYER" }}
        isOwner isCounterparty={false}
      />,
    );
    expect(screen.getByTestId("action-drawer-empty")).toBeInTheDocument();
  });
});
