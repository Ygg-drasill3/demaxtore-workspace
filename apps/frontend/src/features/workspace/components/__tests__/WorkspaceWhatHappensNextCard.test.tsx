import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkspaceWhatHappensNextCard } from "../WorkspaceWhatHappensNextCard";

describe("WorkspaceWhatHappensNextCard", () => {
  it("renders script copy and primary CTA", () => {
    const onPrimary = vi.fn();
    render(
      <WorkspaceWhatHappensNextCard
        script={{
          mood: "action",
          past: "Done step",
          future: "Next step for {{name}}",
          statL: { label: "Left", value: "A" },
          statR: { label: "Right", value: "B" },
          primaryAction: "go",
          primaryLabel: "Continue",
        }}
        vars={{ name: "Buyer" }}
        onPrimaryClick={onPrimary}
      />,
    );
    expect(screen.getByTestId("whn-past")).toHaveTextContent("Done step");
    expect(screen.getByTestId("whn-future")).toHaveTextContent("Next step for Buyer");
    fireEvent.click(screen.getByTestId("whn-primary-cta"));
    expect(onPrimary).toHaveBeenCalled();
  });

  it("shows fallback when no script", () => {
    render(<WorkspaceWhatHappensNextCard />);
    expect(screen.getByTestId("workspace-what-happens-next-fallback")).toBeInTheDocument();
  });
});
