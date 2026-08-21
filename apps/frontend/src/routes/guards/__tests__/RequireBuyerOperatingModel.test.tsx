import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Routes, Route } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import {
  RequireTurkeyFreightOrOrderScope,
  RequireTurkeyImporter,
} from "../RequireBuyerOperatingModel";
import { useAuth } from "@/store/auth.store";
import type { UserDTO } from "@dmx/contracts/auth";

const baseUser: UserDTO = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "buyer@test.com",
  displayName: "Test Buyer",
  role: "BUYER",
  organisation: null,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

function setAuth(partial: Partial<UserDTO> & Pick<UserDTO, "buyerOperatingModel">) {
  useAuth.setState({
    user: { ...baseUser, ...partial },
    accessToken: "tok",
    status: "authenticated",
  });
}

function resetAuth() {
  useAuth.setState({
    user: null,
    accessToken: null,
    status: "unauthenticated",
    accessMode: "full",
    passwordlessScope: null,
  });
}

describe("RequireTurkeyFreightOrOrderScope", () => {
  beforeEach(() => {
    resetAuth();
  });
  afterEach(() => {
    resetAuth();
  });

  it("allows Turkey Importer on bare /buyer/freightiq", () => {
    setAuth({ buyerOperatingModel: "TURKEY_IMPORTER" });
    renderWithProviders(
      <Routes>
        <Route element={<RequireTurkeyFreightOrOrderScope />}>
          <Route path="/buyer/freightiq" element={<div data-testid="freight-hub">hub</div>} />
        </Route>
        <Route path="/buyer/dashboard" element={<div data-testid="dash" />} />
      </Routes>,
      { route: "/buyer/freightiq" },
    );
    expect(screen.getByTestId("freight-hub")).toBeInTheDocument();
  });

  it("blocks International on bare /buyer/freightiq → dashboard", () => {
    setAuth({ buyerOperatingModel: "INTERNATIONAL" });
    renderWithProviders(
      <Routes>
        <Route element={<RequireTurkeyFreightOrOrderScope />}>
          <Route path="/buyer/freightiq" element={<div data-testid="freight-hub">hub</div>} />
        </Route>
        <Route path="/buyer/dashboard" element={<div data-testid="dash" />} />
      </Routes>,
      { route: "/buyer/freightiq" },
    );
    expect(screen.queryByTestId("freight-hub")).toBeNull();
    expect(screen.getByTestId("dash")).toBeInTheDocument();
  });

  it("allows International when orderId is present", () => {
    setAuth({ buyerOperatingModel: "INTERNATIONAL" });
    renderWithProviders(
      <Routes>
        <Route element={<RequireTurkeyFreightOrOrderScope />}>
          <Route path="/buyer/freightiq" element={<div data-testid="freight-hub">hub</div>} />
        </Route>
        <Route path="/buyer/dashboard" element={<div data-testid="dash" />} />
      </Routes>,
      { route: "/buyer/freightiq?orderId=ord-1" },
    );
    expect(screen.getByTestId("freight-hub")).toBeInTheDocument();
  });
});

describe("RequireTurkeyImporter", () => {
  beforeEach(() => {
    resetAuth();
  });
  afterEach(() => {
    resetAuth();
  });

  it("allows Turkey Importer on Turkey-only routes", () => {
    setAuth({ buyerOperatingModel: "TURKEY_IMPORTER" });
    renderWithProviders(
      <Routes>
        <Route element={<RequireTurkeyImporter />}>
          <Route path="/buyer/customs" element={<div data-testid="customs">ok</div>} />
        </Route>
        <Route path="/buyer/dashboard" element={<div data-testid="dash" />} />
      </Routes>,
      { route: "/buyer/customs" },
    );
    expect(screen.getByTestId("customs")).toBeInTheDocument();
  });

  it("blocks International on /buyer/freightiq/request → dashboard", () => {
    setAuth({ buyerOperatingModel: "INTERNATIONAL" });
    renderWithProviders(
      <Routes>
        <Route element={<RequireTurkeyImporter />}>
          <Route path="/buyer/freightiq/request" element={<div data-testid="req">ok</div>} />
        </Route>
        <Route path="/buyer/dashboard" element={<div data-testid="dash" />} />
      </Routes>,
      { route: "/buyer/freightiq/request" },
    );
    expect(screen.queryByTestId("req")).toBeNull();
    expect(screen.getByTestId("dash")).toBeInTheDocument();
  });
});
