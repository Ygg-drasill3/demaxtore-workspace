/** Canonical login URL — static login-ui app (not the main SPA). */
export function loginPageUrl(from?: string): string {
  const url = new URL("/login/", window.location.origin);
  if (from && from.startsWith("/") && !from.startsWith("/login")) {
    url.searchParams.set("from", from);
  }
  return `${url.pathname}${url.search}`;
}

export function redirectToLogin(from?: string): void {
  window.location.replace(loginPageUrl(from));
}

export function isOnLoginPage(): boolean {
  const path = window.location.pathname;
  return path === "/login" || path === "/login/";
}

export function resolvePostLoginPath(role: string, from?: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("/login")) {
    return from;
  }
  const ROLE_DASHBOARD: Record<string, string> = {
    BUYER: "/buyer/inbox",
    SUPPLIER: "/supplier/dashboard",
    ADMIN: "/admin/dashboard",
    SALES_CONTROL: "/sales/dashboard",
    SUPER_ADMIN: "/admin/dashboard",
    OPS_MANAGER: "/operations",
    LOGISTICS_OPERATOR: "/operations/freight",
    FINANCE_OPERATOR: "/operations",
    DOCUMENT_CONTROLLER: "/admin/dashboard",
    FORWARDER: "/forwarder/dashboard",
  };
  return ROLE_DASHBOARD[role] ?? "/";
}
