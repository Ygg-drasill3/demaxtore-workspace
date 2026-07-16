import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { OnlinePaymentDisabledNotice } from "../OnlinePaymentDisabledNotice";
import { ONLINE_PAYMENTS_DISABLED_FALLBACK } from "../../hooks/usePaymentCapabilities";

const usePaymentCapabilities = vi.fn();

vi.mock("../../hooks/usePaymentCapabilities", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/usePaymentCapabilities")>();
  return {
    ...actual,
    usePaymentCapabilities: (...args: unknown[]) => usePaymentCapabilities(...args),
  };
});

describe("<OnlinePaymentDisabledNotice /> (PAY-UI-002)", () => {
  beforeEach(() => {
    usePaymentCapabilities.mockReset();
  });

  it("shows notice when online collection is disabled", () => {
    usePaymentCapabilities.mockReturnValue({
      data: {
        onlineCollectionEnabled: false,
        paymentIntentApiEnabled: false,
        provider: null,
        manualMilestoneTracking: true,
        message: ONLINE_PAYMENTS_DISABLED_FALLBACK,
      },
      isError: false,
    });

    renderWithProviders(<OnlinePaymentDisabledNotice />);
    expect(screen.getByTestId("online-payments-disabled-notice")).toHaveTextContent(
      ONLINE_PAYMENTS_DISABLED_FALLBACK,
    );
  });

  it("hides notice when online collection is enabled", () => {
    usePaymentCapabilities.mockReturnValue({
      data: {
        onlineCollectionEnabled: true,
        paymentIntentApiEnabled: true,
        provider: "stripe",
        manualMilestoneTracking: true,
        message: null,
      },
      isError: false,
    });

    renderWithProviders(<OnlinePaymentDisabledNotice />);
    expect(screen.queryByTestId("online-payments-disabled-notice")).not.toBeInTheDocument();
  });

  it("shows safe fallback when capabilities API fails", () => {
    usePaymentCapabilities.mockReturnValue({
      data: undefined,
      isError: true,
    });

    renderWithProviders(<OnlinePaymentDisabledNotice />);
    expect(screen.getByTestId("online-payments-disabled-notice")).toHaveTextContent(
      ONLINE_PAYMENTS_DISABLED_FALLBACK,
    );
  });
});
