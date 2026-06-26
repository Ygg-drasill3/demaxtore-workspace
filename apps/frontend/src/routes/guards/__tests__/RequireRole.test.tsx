// apps/frontend/src/routes/guards/__tests__/RequireRole.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { Routes, Route } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { RequireRole } from "../RequireRole";
import { useAuth } from "@/store/auth.store";
import type { UserDTO } from "@dmx/contracts/auth";

const baseUser: UserDTO = {
  id: "u-1", email: "a@b.com", displayName: "Test User",
  role: "BUYER", organisation: null, avatarUrl: null,
  createdAt: new Date().toISOString(),
};

function setAuth(user: UserDTO) {
  useAuth.setState({ user, accessToken: "tok", status: "authenticated" });
}

function Tree({ allow }: { allow: Array<UserDTO["role"]> }) {
  return (
    <Routes>
      <Route path="/" element={<RequireRole allow={allow} />}>
        <Route index element={<div data-testid="protected">OK</div>} />
      </Route>
      <Route path="/buyer/control-tower" element={<div data-testid="buyer-home" />} />
      <Route path="/supplier/dashboard" element={<div data-testid="supplier-home" />} />
      <Route path="/admin/dashboard"    element={<div data-testid="admin-home" />} />
    </Routes>
  );
}

describe("<RequireRole />", () => {
  beforeEach(() => {
    useAuth.setState({ user: null, accessToken: null, status: "unauthenticated" });
  });

  it("renders children when the user's role is allowed", () => {
    setAuth(baseUser);
    renderWithProviders(<Tree allow={["BUYER"]} />, { route: "/" });
    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });

  it("BUYER hitting an ADMIN-only branch is bounced to buyer control tower", () => {
    setAuth({ ...baseUser, role: "BUYER" });
    renderWithProviders(<Tree allow={["ADMIN"]} />, { route: "/" });
    expect(screen.getByTestId("buyer-home")).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).toBeNull();
  });

  it("SUPPLIER hitting an ADMIN branch is bounced to /supplier/dashboard", () => {
    setAuth({ ...baseUser, role: "SUPPLIER" });
    renderWithProviders(<Tree allow={["ADMIN"]} />, { route: "/" });
    expect(screen.getByTestId("supplier-home")).toBeInTheDocument();
  });

  it("an unauthenticated user is sent to /login", () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<RequireRole allow={["BUYER"]} />}>
          <Route index element={<div data-testid="protected" />} />
        </Route>
        <Route path="/login" element={<div data-testid="login" />} />
      </Routes>,
      { route: "/" },
    );
    expect(screen.getByTestId("login")).toBeInTheDocument();
  });
});
