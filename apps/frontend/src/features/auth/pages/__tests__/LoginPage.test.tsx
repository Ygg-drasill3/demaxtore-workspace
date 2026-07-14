// apps/frontend/src/features/auth/pages/__tests__/LoginPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import LoginPage from "../LoginPage";
import { MemoryRouter } from "react-router-dom";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, replace: vi.fn() });
  });

  it("redirects to the static login app", () => {
    render(
      <MemoryRouter initialEntries={["/login?from=/buyer/control-tower"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(window.location.replace).toHaveBeenCalledWith("/login/?from=%2Fbuyer%2Fcontrol-tower");
  });
});
