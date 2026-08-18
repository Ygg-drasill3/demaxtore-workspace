import { useAuth } from "@/store/auth.store";
import { waitForAuthReady } from "@/lib/wait-for-auth";

export function unauthenticatedApiError() {
  return {
    response: {
      status: 401,
      data: { error: { code: "UNAUTHENTICATED", message: "Please sign in again." } },
    },
  };
}

/** Resolves a bearer token, refreshing the session via cookie when needed. */
export async function ensureAccessToken(): Promise<string> {
  await waitForAuthReady();

  const read = () => useAuth.getState().accessToken;
  if (read()) return read()!;

  const { status, accessMode } = useAuth.getState();
  if (status === "unauthenticated" || accessMode === "passwordless") {
    throw unauthenticatedApiError();
  }

  await useAuth.getState().hydrate();
  if (read()) return read()!;

  await useAuth.getState().refresh();
  if (read()) return read()!;

  throw unauthenticatedApiError();
}
