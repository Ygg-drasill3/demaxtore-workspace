const AUTH_STORAGE_KEY = "dmx.auth";

const ROLE_DASHBOARD = {
  BUYER: "/buyer/dashboard",
  SUPPLIER: "/supplier/dashboard",
  ADMIN: "/admin/dashboard",
  SALES_CONTROL: "/sales/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
  OPS_MANAGER: "/operations",
  LOGISTICS_OPERATOR: "/operations/freight",
  FINANCE_OPERATOR: "/operations",
  DOCUMENT_CONTROLLER: "/admin/dashboard",
  FORWARDER: "/forwarder/dashboard",
  ORIGIN_AGENT: "/partner",
  TRUCKER: "/partner",
  CUSTOMS_BROKER: "/partner",
};

export function persistAuthSession(user, accessToken) {
  const payload = {
    state: { user, accessToken },
    version: 0,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

export function dashboardForRole(role) {
  return ROLE_DASHBOARD[role] ?? "/";
}

export function postLoginPath(role) {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");
  if (from && from.startsWith("/") && !from.startsWith("/login")) {
    return from;
  }
  return dashboardForRole(role);
}

export async function loginWithCredentials(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const issue = data?.error?.details?.issues?.[0];
    const message =
      (typeof issue?.message === "string" ? issue.message : null) ??
      data?.error?.message ??
      (res.status === 401 ? "Invalid email or password." : "Sign in failed. Please try again.");
    throw new Error(message);
  }

  if (!data?.user || !data?.accessToken) {
    throw new Error("Unexpected server response.");
  }

  persistAuthSession(data.user, data.accessToken);
  return data.user;
}

export async function registerAccount(input) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.error?.message ?? "Could not create account. Please try again.";
    throw new Error(message);
  }

  if (!data?.user || !data?.accessToken) {
    throw new Error("Unexpected server response.");
  }

  persistAuthSession(data.user, data.accessToken);
  return data.user;
}

export async function requestPasswordReset(email) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Request failed.");
  }

  return data;
}

export async function isGoogleSignInEnabled() {
  try {
    const res = await fetch("/api/auth/google/status", { credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.enabled);
  } catch {
    return false;
  }
}

export function startGoogleSignIn() {
  window.location.assign("/api/auth/google");
}

export async function completeOAuthLogin() {
  const refreshRes = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  const refreshData = await refreshRes.json().catch(() => ({}));
  if (!refreshRes.ok || !refreshData?.accessToken) {
    throw new Error("OAuth session missing");
  }

  const meRes = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${refreshData.accessToken}` },
    credentials: "include",
  });

  const user = await meRes.json().catch(() => null);
  if (!meRes.ok || !user?.id) {
    throw new Error("Could not load user profile");
  }

  persistAuthSession(user, refreshData.accessToken);
  return user;
}
