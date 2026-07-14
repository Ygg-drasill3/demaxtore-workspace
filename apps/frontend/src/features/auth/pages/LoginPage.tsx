// apps/frontend/src/features/auth/pages/LoginPage.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { redirectToLogin } from "@/lib/login-redirect";

/** Login UI is served from login-static at /login/. */
export default function LoginPage() {
  const location = useLocation();

  useEffect(() => {
    const from = new URLSearchParams(location.search).get("from") ?? undefined;
    redirectToLogin(from ?? undefined);
  }, [location]);

  return null;
}
