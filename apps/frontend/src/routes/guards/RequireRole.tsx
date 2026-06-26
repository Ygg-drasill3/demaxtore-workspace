// apps/frontend/src/routes/guards/RequireRole.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/auth.store";
import { ROLE_DASHBOARD, type Role } from "@dmx/contracts/auth";

/**
 * Role gate. Use after <RequireAuth>.
 *
 * Unauthorized users are bounced to their own dashboard — never to /login,
 * because they are authenticated, just not authorised for this branch.
 */
export function RequireRole({ allow }: { allow: Role[] }) {
  const { status, user } = useAuth();

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to={ROLE_DASHBOARD[user.role]} replace />;
  }
  return <Outlet />;
}
