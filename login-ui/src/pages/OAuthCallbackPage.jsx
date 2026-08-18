import { useEffect } from "react";
import { completeOAuthLogin, postLoginPath } from "../lib/auth";

export default function OAuthCallbackPage() {
  useEffect(() => {
    (async () => {
      try {
        const user = await completeOAuthLogin();
        window.location.assign(postLoginPath(user.role));
      } catch {
        window.location.replace("/login/?error=google_auth_failed");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen grid place-items-center bg-white text-slate-600 text-sm">
      Google ile giriş tamamlanıyor...
    </div>
  );
}
