import { useAuth } from "@/store/auth.store";
import { useGlobalAlertToasts } from "../hooks/useGlobalAlertToasts";

/** Mount once at app root — pushes alert toasts for delays and exceptions. */
export function GlobalAlertBridge() {
  const status = useAuth((s) => s.status);
  useGlobalAlertToasts(status === "authenticated");
  return null;
}
