// apps/frontend/src/components/ui/__tests__/Modal.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../Modal";

describe("<Modal />", () => {
  it("does not render when closed", () => {
    render(<Modal open={false} onClose={() => {}}>hi</Modal>);
    expect(screen.queryByTestId("modal")).toBeNull();
  });

  it("renders title + content when open", () => {
    render(
      <Modal open onClose={() => {}} title="Title" description="Body copy" testId="m1">
        <div>content</div>
      </Modal>,
    );
    expect(screen.getByTestId("m1")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("closes on ESC", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}>x</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} testId="m2">x</Modal>);
    fireEvent.click(screen.getByTestId("m2-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});
