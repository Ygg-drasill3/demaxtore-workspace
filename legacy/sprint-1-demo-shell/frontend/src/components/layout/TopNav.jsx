import React from "react";
import { Search, Command } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";

export function TopNav() {
  return (
    <header
      data-testid="top-nav"
      className="sticky top-0 z-20 h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 ml-64"
    >
      <div className="flex items-center gap-3 max-w-xl w-full">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            data-testid="topnav-search"
            placeholder="Search workspaces, suppliers, documents…"
            className="h-9 w-full pl-9 pr-12 rounded-lg border border-zinc-200 bg-zinc-50/60 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 focus:bg-white focus:border-zinc-300 transition-all"
          />
          <span className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1 h-6 px-1.5 rounded-md border border-zinc-200 bg-white text-[10px] font-mono text-zinc-500">
            <Command className="h-2.5 w-2.5" /> K
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

export default TopNav;
