// apps/frontend/src/features/auth/pages/RegisterPage.tsx
import { useEffect } from "react";

/** Full-page auth UI is served from login-static; bounce SPA navigations there. */
export default function RegisterPage() {
  useEffect(() => {
    window.location.replace("/register");
  }, []);

  return null;
}
