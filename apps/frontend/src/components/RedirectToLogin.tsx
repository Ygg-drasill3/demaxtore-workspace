import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { redirectToLogin } from "@/lib/login-redirect";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";

export function RedirectToLogin() {
  const location = useLocation();

  useEffect(() => {
    const from = `${location.pathname}${location.search}`;
    redirectToLogin(from.startsWith("/login") ? undefined : from);
  }, [location]);

  return <AuthLoadingScreen />;
}
