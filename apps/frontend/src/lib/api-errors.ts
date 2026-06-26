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
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 403) return body?.error?.message ?? body?.message ?? "You do not have access to this resource.";
  if (status === 404) return body?.error?.message ?? body?.message ?? "Not found.";
  if (status === 429) return "Too many requests. Wait a moment and retry.";
  if (status === 503) return body?.message ?? "Service temporarily unavailable.";

  return body?.error?.message ?? body?.message ?? ax.message ?? fallback;
}
