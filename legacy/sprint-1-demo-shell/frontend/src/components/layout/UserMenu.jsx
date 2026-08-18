import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL } from "@/lib/nav";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || user?.email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="user-menu-trigger"
          className="flex items-center gap-2.5 h-9 pl-1 pr-3 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors"
        >
          <span className="h-7 w-7 rounded-full bg-zinc-900 text-white text-xs font-semibold flex items-center justify-center">
            {initials}
          </span>
          <span className="text-sm font-medium text-zinc-900 hidden sm:inline">
            {user?.name || user?.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-sm text-zinc-900">{user?.name}</span>
          <span className="text-xs text-zinc-500">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs text-zinc-500 cursor-default focus:bg-transparent">
          <Building2 className="h-3.5 w-3.5 mr-2" />
          {ROLE_LABEL[user?.role] || "Member"}
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="user-menu-profile"
          onSelect={() => navigate("/settings")}
        >
          <UserIcon className="h-3.5 w-3.5 mr-2" /> Profile (Sprint 2)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="user-menu-logout"
          className="text-red-600 focus:text-red-700 focus:bg-red-50"
          onSelect={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
