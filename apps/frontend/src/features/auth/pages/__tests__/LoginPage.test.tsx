// apps/frontend/src/features/auth/pages/__tests__/LoginPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import LoginPage from "../LoginPage";
import { useAuth } from "@/store/auth.store";

vi.mock("@/hooks/useAuthHydrated", () => ({
  useAuthHydrated: () => true,
}));

describe("<LoginPage />", () => {
  beforeEach(() => useAuth.setState({ user: null, accessToken: null, status: "unauthenticated" }));

  it("renders both inputs and a submit", () => {
    renderWithProviders(<LoginPage />, { route: "/login" });
    expect(screen.getByTestId("login-email")).toBeInTheDocument();
    expect(screen.getByTestId("login-password")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toBeInTheDocument();
  });

  it("shows a Zod email error when invalid", async () => {
    renderWithProviders(<LoginPage />, { route: "/login" });
    fireEvent.change(screen.getByTestId("login-email"),    { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByTestId("login-password"), { target: { value: "12345678" } });
    fireEvent.click(screen.getByTestId("login-submit"));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it("surfaces server error returned by login()", async () => {
    vi.spyOn(useAuth.getState(), "login").mockRejectedValueOnce({
      response: { data: { error: { message: "Bad creds" } } },
    });

    renderWithProviders(<LoginPage />, { route: "/login" });
    fireEvent.change(screen.getByTestId("login-email"),    { target: { value: "x@y.io" } });
    fireEvent.change(screen.getByTestId("login-password"), { target: { value: "12345678" } });
    fireEvent.click(screen.getByTestId("login-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toHaveTextContent("Bad creds");
    });
  });
});
