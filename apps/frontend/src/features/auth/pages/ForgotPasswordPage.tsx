// apps/frontend/src/features/auth/pages/ForgotPasswordPage.tsx
import { useEffect } from "react";

/** Full-page auth UI is served from login-static; bounce SPA navigations there. */
export default function ForgotPasswordPage() {
  useEffect(() => {
    window.location.replace("/forgot-password");
  }, []);

  return null;
}
