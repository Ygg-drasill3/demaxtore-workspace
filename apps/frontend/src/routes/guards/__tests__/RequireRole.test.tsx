// apps/frontend/src/routes/guards/__tests__/RequireRole.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Routes, Route } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { RequireRole } from "../RequireRole";
import { useAuth } from "@/store/auth.store";
import { ROLE_DASHBOARD, type UserDTO } from "@dmx/contracts/auth";
import * as loginRedirect from "@/lib/login-redirect";

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
      <Route path={ROLE_DASHBOARD.BUYER}    element={<div data-testid="buyer-home" />} />
      <Route path={ROLE_DASHBOARD.SUPPLIER} element={<div data-testid="supplier-home" />} />
      <Route path={ROLE_DASHBOARD.ADMIN}    element={<div data-testid="admin-home" />} />
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

  it("BUYER hitting an ADMIN-only branch is bounced to the buyer landing route", () => {
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

  it("ORIGIN_AGENT bouncing off broker-only customs list is not granted the page", () => {
    setAuth({ ...baseUser, role: "ORIGIN_AGENT" });
    renderWithProviders(
      <Routes>
        <Route path="/partner/customs" element={<RequireRole allow={["CUSTOMS_BROKER"]} />}>
          <Route index element={<div data-testid="broker-customs-list">OK</div>} />
        </Route>
        <Route path="/partner" element={<div data-testid="origin-home" />} />
      </Routes>,
      { route: "/partner/customs" },
    );
    expect(screen.queryByTestId("broker-customs-list")).toBeNull();
  });

  it("TRUCKER bouncing off broker-only customs list is not granted the page", () => {
    setAuth({ ...baseUser, role: "TRUCKER" });
    renderWithProviders(
      <Routes>
        <Route path="/partner/customs" element={<RequireRole allow={["CUSTOMS_BROKER"]} />}>
          <Route index element={<div data-testid="broker-customs-list">OK</div>} />
        </Route>
        <Route path="/partner" element={<div data-testid="trucker-home" />} />
      </Routes>,
      { route: "/partner/customs" },
    );
    expect(screen.queryByTestId("broker-customs-list")).toBeNull();
  });

  it("CUSTOMS_BROKER bouncing off trucker-only inland list is not granted the page", () => {
    setAuth({ ...baseUser, role: "CUSTOMS_BROKER" });
    renderWithProviders(
      <Routes>
        <Route path="/partner/inland" element={<RequireRole allow={["TRUCKER"]} />}>
          <Route index element={<div data-testid="trucker-inland-list">OK</div>} />
        </Route>
        <Route path="/partner" element={<div data-testid="broker-home" />} />
      </Routes>,
      { route: "/partner/inland" },
    );
    expect(screen.queryByTestId("trucker-inland-list")).toBeNull();
  });

  it("ORIGIN_AGENT bouncing off trucker-only inland list is not granted the page", () => {
    setAuth({ ...baseUser, role: "ORIGIN_AGENT" });
    renderWithProviders(
      <Routes>
        <Route path="/partner/inland" element={<RequireRole allow={["TRUCKER"]} />}>
          <Route index element={<div data-testid="trucker-inland-list">OK</div>} />
        </Route>
        <Route path="/partner" element={<div data-testid="origin-home" />} />
      </Routes>,
      { route: "/partner/inland" },
    );
    expect(screen.queryByTestId("trucker-inland-list")).toBeNull();
  });

  it("an unauthenticated user is sent to /login", () => {
    // The guard leaves the SPA with a full document navigation so no stale
    // authenticated state survives, which jsdom cannot perform.
    const spy = vi.spyOn(loginRedirect, "redirectToLogin").mockImplementation(() => {});
    renderWithProviders(
      <Routes>
        <Route path="/" element={<RequireRole allow={["BUYER"]} />}>
          <Route index element={<div data-testid="protected" />} />
        </Route>
      </Routes>,
      { route: "/" },
    );
    expect(spy).toHaveBeenCalledWith("/");
    expect(screen.queryByTestId("protected")).toBeNull();
    spy.mockRestore();
  });
});
