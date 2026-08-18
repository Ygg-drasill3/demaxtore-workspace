import type { AxiosError } from "axios";
import type { ApiError } from "@dmx/contracts/api";

export function getApiErrorMessage(
  err: unknown,
  fallback = "Could not load data.",
): string {
  const ax = err as AxiosError<ApiError & { message?: string }>;
  const status = ax.response?.status;
  const body = ax.response?.data;

  if (ax.code === "ECONNABORTED") return "Request timed out. Please try again.";
  if (body?.error?.code === "PAYMENT_MILESTONE_REQUIRED") {
    return "Production cannot start until the deposit is recorded. DeMaxtore Operations will confirm the deposit on this order.";
  }
  if (body?.error?.code === "PAYMENT_PLAN_REQUIRED") {
    return "A payment plan is required before production can start. DeMaxtore Operations will set this up.";
  }
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 403) return body?.error?.message ?? body?.message ?? "You do not have access to this resource.";
  if (status === 404) return body?.error?.message ?? body?.message ?? "This workspace was not found. It may have been deleted.";
  if (status === 429) return "Too many requests. Wait a moment and retry.";
  if (status === 502 || status === 503 || status === 504) return body?.message ?? "Service temporarily unavailable. Please retry in a moment.";
  if (!status && ax.message === "Network Error") return "Could not reach the server. Check your connection and retry.";

  return body?.error?.message ?? body?.message ?? ax.message ?? fallback;
}
