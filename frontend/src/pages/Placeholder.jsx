import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Construction, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { dashboardPathFor } from "@/lib/nav";

export default function PlaceholderPage() {
  const location = useLocation();
  const { user } = useAuth();
  const segments = location.pathname.replace(/^\/+|\/+$/g, "").split("/");
  const title = segments[segments.length - 1] || "Coming soon";

  return (
    <div data-testid="placeholder-page" className="space-y-8">
      <header>
        <span className="dmx-label">{segments[0] || "Module"}</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-950 mt-1 capitalize">
          {title.replace(/-/g, " ")}
        </h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-xl">
          This module is part of the DeMaxtore roadmap. Sprint 1 builds only the platform foundation.
        </p>
      </header>

      <div className="dmx-card p-10 text-center max-w-2xl mx-auto">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-5">
          <Construction className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-zinc-950">
          Reserved for Sprint 2+
        </h2>
        <p className="text-sm text-zinc-500 mt-2">
          RFQ creation, Quotation workflow, PO Management, FreightIQ, Inspection and Shipment Visibility will plug into this foundation.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <StatusBadge type="WARNING">Not built</StatusBadge>
          <StatusBadge type="INFO">Future module</StatusBadge>
        </div>
        <Link
          data-testid="placeholder-go-dashboard"
          to={dashboardPathFor(user?.role)}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 hover:underline"
        >
          Back to dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
