import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { dashboardPathFor } from "@/lib/nav";

export function RoleRoute({ allow, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    return <Navigate to="/unauthorized" replace state={{ attemptedRole: allow }} />;
  }
  // Optionally redirect to role's dashboard if mismatch
  void dashboardPathFor;
  return children;
}

export default RoleRoute;
