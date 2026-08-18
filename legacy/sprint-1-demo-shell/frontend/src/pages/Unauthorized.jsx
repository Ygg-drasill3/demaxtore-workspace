import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { dashboardPathFor } from "@/lib/nav";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div data-testid="unauthorized-page" className="w-full max-w-lg dmx-card p-10 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-5">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950">
          You don’t have access to that area
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          Your role <span className="font-medium text-zinc-900">{user?.role || "guest"}</span>{" "}
          isn’t authorised for this resource. Return to your own dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            data-testid="unauthorized-back"
            to={dashboardPathFor(user?.role)}
            className="h-10 px-4 inline-flex items-center justify-center rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800"
          >
            Go to my dashboard
          </Link>
          <button
            data-testid="unauthorized-logout"
            onClick={logout}
            className="h-10 px-4 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-medium hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
