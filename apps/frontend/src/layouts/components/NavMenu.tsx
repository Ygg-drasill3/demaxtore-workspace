// Shared grouped navigation — desktop sidebar + mobile drawer
import { NavLink } from "react-router-dom";
import { m, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavGroup } from "@/routes/navigation";
import { MotionNumber } from "@/motion/primitives/MotionNumber";
import { NavTooltip } from "./NavTooltip";
import { springMicro, springSnappy } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

interface NavMenuProps {
  groups:       NavGroup[];
  collapsed:    boolean;
  badges?:      Record<string, number>;
  onNavigate?:  () => void;
}

function navLinkTestId(testId: string): string {
  return /^(qa|sqa|scqa|aqa)-/.test(testId) ? testId : `nav-${testId}`;
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const capped = count > 99;

  return (
    <span className="relative z-[1] ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-900/80 px-1.5 text-[10px] font-semibold tabular-nums text-white">
      {capped ? (
        <span>99+</span>
      ) : (
        <MotionNumber value={count} decimals={0} />
      )}
    </span>
  );
}

interface NavItemLinkProps {
  to:         string;
  label:      string;
  icon:       NavGroup["items"][0]["icon"];
  testId:     string;
  end?:       boolean;
  collapsed:  boolean;
  badge?:     number;
  onNavigate?: () => void;
}

function NavItemLink({
  to, label, icon: Icon, testId, end, collapsed, badge, onNavigate,
}: NavItemLinkProps) {
  const reduced = useReducedMotion();

  const link = (
    <NavLink
      to={to}
      end={end}
      data-testid={navLinkTestId(testId)}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center rounded-lg text-[13px] outline-none",
          collapsed ? "h-9 justify-center px-0" : "h-8 gap-2.5 px-2",
          isActive ? "text-white" : "text-zinc-400 hover:text-zinc-100",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <m.span
              layoutId="nav-active-bg"
              className={cn(
                "pointer-events-none absolute inset-0 rounded-lg",
                collapsed
                  ? "bg-white/[0.1] ring-1 ring-white/15"
                  : "bg-gradient-to-r from-accent-900/40 via-white/[0.08] to-transparent ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
              )}
              transition={reduced ? { duration: 0 } : springSnappy}
            />
          )}
          {isActive && !collapsed && (
            <m.span
              layoutId="nav-active-indicator"
              className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent-500 shadow-[0_0_8px_rgba(57,73,171,0.5)]"
              transition={reduced ? { duration: 0 } : springMicro}
            />
          )}
          <m.span
            className={cn(
              "relative z-[1] grid shrink-0 place-items-center rounded-md",
              collapsed ? "h-8 w-8" : "h-7 w-7",
              isActive
                ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                : "bg-transparent text-zinc-500 group-hover:bg-white/[0.06] group-hover:text-zinc-200",
            )}
            whileHover={reduced || isActive ? undefined : { scale: 1.05 }}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            transition={springMicro}
          >
            <Icon className="h-4 w-4" />
          </m.span>
          {!collapsed && (
            <>
              <span className={cn("relative z-[1] truncate font-medium", isActive && "text-white")}>
                {label}
              </span>
              {badge !== undefined && <NavBadge count={badge} />}
            </>
          )}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <NavTooltip label={label} enabled>
        {link}
      </NavTooltip>
    );
  }

  return link;
}

interface NavGroupSectionProps {
  group:      NavGroup;
  collapsed:  boolean;
  badges:     Record<string, number>;
  onNavigate?: () => void;
}

function NavGroupSection({ group, collapsed, badges, onNavigate }: NavGroupSectionProps) {
  if (collapsed) {
    return (
      <div className="space-y-px" data-testid={group.testId}>
        {group.items.map((item) => (
          <NavItemLink
            key={item.to}
            {...item}
            collapsed
            badge={badges[item.testId] ?? item.badge}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <div data-testid={group.testId}>
      <div className="mb-1 flex items-center gap-2 px-2.5">
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {group.label}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="space-y-px">
        {group.items.map((item) => (
          <NavItemLink
            key={item.to}
            {...item}
            collapsed={false}
            badge={badges[item.testId] ?? item.badge}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export function NavMenu({ groups, collapsed, badges = {}, onNavigate }: NavMenuProps) {
  return (
    <LayoutGroup id="app-nav">
      <div className="space-y-2">
        {groups.map((group) => (
          <NavGroupSection
            key={group.id}
            group={group}
            collapsed={collapsed}
            badges={badges}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </LayoutGroup>
  );
}
