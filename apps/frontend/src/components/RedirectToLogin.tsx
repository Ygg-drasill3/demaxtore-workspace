import { Navigate, useLocation } from "react-router-dom";
import { loginPageUrl } from "@/lib/login-redirect";

/** In-SPA redirect to the login route (preserves return path). */
export function RedirectToLogin() {
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;
  const to = loginPageUrl(from.startsWith("/login") ? undefined : from);
  return <Navigate to={to} replace />;
}
