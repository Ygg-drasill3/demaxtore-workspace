import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) {
    return (
      <div
        data-testid="auth-loading"
        className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"
      >
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="h-2 w-2 rounded-full bg-zinc-300 animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse [animation-delay:120ms]" />
          <div className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
