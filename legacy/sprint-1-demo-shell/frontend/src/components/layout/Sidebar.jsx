import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NAV_BY_ROLE, ROLE_LABEL } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const items = NAV_BY_ROLE[user?.role] || [];

  return (
    <aside
      data-testid="app-sidebar"
      className="fixed left-0 top-0 z-30 h-screen w-64 border-r border-zinc-200 bg-white flex flex-col"
    >
      <div className="h-16 px-5 flex items-center gap-2.5 border-b border-zinc-200">
        <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-display text-sm font-bold">
          dM
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[15px] font-semibold tracking-tight text-zinc-950">
            DeMaxtore
          </span>
          <span className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">
            Sourcing OS
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <div className="dmx-label px-3 pb-2 pt-1">
          {ROLE_LABEL[user?.role] || "Workspace"}
        </div>
        {items.map((it) => {
          const Icon = it.icon;
          const active =
            location.pathname === it.to ||
            (it.to !== "/" && location.pathname.startsWith(it.to + "/"));
          return (
            <Link
              key={it.key}
              to={it.to}
              data-testid={`nav-${it.key}`}
              data-active={active}
              className="dmx-sidebar-link"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-4">
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
          <div className="dmx-label mb-1">Architecture</div>
          <p className={cn("text-xs text-zinc-600 leading-relaxed")}>
            One Workspace · One Timeline · One State Machine · One Next-Action Engine.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
