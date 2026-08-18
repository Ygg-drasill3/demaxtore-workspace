import { env, isProd } from "../../config/env.js";
import { AppError } from "../../utils/httpErrors.js";
import type { PaymentProvider } from "./providers/types.js";
import { StubPaymentProvider } from "./providers/stub.provider.js";

/** True when a real PSP is configured for online payment collection. */
export function isOnlinePaymentCollectionEnabled(): boolean {
  return env.ONLINE_PAYMENTS_ENABLED === true && env.PAYMENT_PROVIDER !== "stub";
}

/** Whether payment intent API may be called (dev/test stub or real PSP). */
export function isPaymentIntentApiEnabled(): boolean {
  if (isOnlinePaymentCollectionEnabled()) return true;
  if (isProd) return false;
  return env.PAYMENT_PROVIDER === "stub" || env.NODE_ENV === "test";
}

export function resolvePaymentProvider(): PaymentProvider {
  if (isOnlinePaymentCollectionEnabled()) {
    // Future: stripe, bank, etc. — blocked until implemented.
    throw new AppError(503, "PAYMENT_PROVIDER_NOT_IMPLEMENTED", {
      message: "Configured payment provider is not implemented yet",
    });
  }

  if (isProd) {
    throw new AppError(503, "ONLINE_PAYMENTS_DISABLED", {
      message:
        "Online payment collection is not enabled. Payment milestones can be recorded manually.",
    });
  }

  if (env.PAYMENT_PROVIDER === "stub" || env.NODE_ENV === "test" || env.NODE_ENV === "development") {
    return new StubPaymentProvider();
  }

  throw new AppError(503, "ONLINE_PAYMENTS_DISABLED", {
    message: "Online payment collection is not enabled.",
  });
}

export function getPaymentCapabilities() {
  return {
    onlineCollectionEnabled: isOnlinePaymentCollectionEnabled(),
    paymentIntentApiEnabled: isPaymentIntentApiEnabled(),
    provider: isOnlinePaymentCollectionEnabled() ? env.PAYMENT_PROVIDER : null,
    manualMilestoneTracking: true,
    message: isPaymentIntentApiEnabled()
      ? null
      : "Online payment collection is not currently enabled. Payment milestones can still be recorded manually by authorized users.",
  };
}
