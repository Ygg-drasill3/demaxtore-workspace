// apps/frontend/src/features/auth/pages/__tests__/LoginPage.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "../LoginPage";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuthGate", () => ({
  useAuthGate: () => ({
    loading: false,
    timedOut: false,
    retry: vi.fn(),
    isAuthenticated: false,
    user: null,
  }),
}));

vi.mock("@/store/auth.store", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

describe("LoginPage", () => {
  it("renders email/password form with E2E test ids", () => {
    render(
      <MemoryRouter initialEntries={["/login?from=/buyer/control-tower"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("login-email")).toBeInTheDocument();
    expect(screen.getByTestId("login-password")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toBeInTheDocument();
  });
});
