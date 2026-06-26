// Shared grouped navigation — desktop sidebar + mobile drawer
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { NavGroup } from "@/routes/navigation";

interface NavMenuProps {
  groups:    NavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
}

export function NavMenu({ groups, collapsed, onNavigate }: NavMenuProps) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.id} data-testid={group.testId}>
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {group.label}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  data-testid={`nav-${item.testId}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-xl text-sm transition-all duration-200",
                      collapsed ? "h-10 justify-center px-0" : "h-10 px-2.5",
                      isActive
                        ? "text-white"
                        : "text-zinc-400 hover:text-zinc-100",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className={cn(
                            "pointer-events-none absolute inset-0 rounded-xl transition-all duration-200",
                            collapsed
                              ? "bg-white/[0.1] ring-1 ring-white/15"
                              : "bg-gradient-to-r from-accent-900/40 via-white/[0.08] to-transparent ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                          )}
                        />
                      )}
                      {isActive && !collapsed && (
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent-500 shadow-[0_0_8px_rgba(57,73,171,0.5)]" />
                      )}
                      <span
                        className={cn(
                          "relative z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all duration-200",
                          collapsed && "h-9 w-9",
                          isActive
                            ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                            : "bg-transparent text-zinc-500 group-hover:bg-white/[0.06] group-hover:text-zinc-200",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {!collapsed && (
                        <>
                          <span className={cn("relative z-[1] truncate font-medium", isActive && "text-white")}>
                            {item.label}
                          </span>
                          {item.badge !== undefined && (
                            <span className="relative z-[1] ml-auto text-[10px] font-semibold bg-accent-900/80 text-white px-1.5 py-0.5 rounded-full tabular-nums">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
