// apps/frontend/src/components/ui/__tests__/Button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../Button";

describe("<Button />", () => {
  it("renders children and fires onClick", () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("blocks interaction while loading", () => {
    const fn = vi.fn();
    render(<Button loading onClick={fn}>Save</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(fn).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies destructive styling for destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button", { name: /delete/i });
    expect(btn.className).toMatch(/bg-red-600/);
  });
});
