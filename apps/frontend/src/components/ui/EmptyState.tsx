// apps/frontend/src/components/ui/EmptyState.tsx
import { type ReactNode } from "react";
import { m } from "framer-motion";
import { Inbox } from "lucide-react";
import { springGentle, staggerContainer } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

interface Props {
  icon?:    ReactNode;
  title:    string;
  body?:    string;
  action?:  ReactNode;
  testId?:  string;
}

export function EmptyState({ icon, title, body, action, testId = "empty-state" }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div data-testid={testId} className="dmx-card p-10 flex flex-col items-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-paper-100 grid place-items-center text-zinc-500">
          {icon ?? <Inbox className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-display text-base font-semibold tracking-tight">{title}</div>
          {body && <div className="text-xs text-zinc-500 mt-1 max-w-md">{body}</div>}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }

  return (
    <m.div
      data-testid={testId}
      className="dmx-card p-10 flex flex-col items-center text-center gap-3 dmx-motion-gpu"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <m.div
        className="h-12 w-12 rounded-full bg-paper-100 grid place-items-center text-zinc-500"
        variants={{
          hidden: { opacity: 0, scale: 0.8, rotate: -8 },
          visible: { opacity: 1, scale: 1, rotate: 0, transition: springGentle },
        }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {icon ?? <Inbox className="h-5 w-5" />}
      </m.div>
      <m.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0, transition: springGentle },
        }}
      >
        <div className="font-display text-base font-semibold tracking-tight">{title}</div>
        {body && <div className="text-xs text-zinc-500 mt-1 max-w-md">{body}</div>}
      </m.div>
      {action && (
        <m.div
          className="mt-2"
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0, transition: { ...springGentle, delay: 0.08 } },
          }}
        >
          {action}
        </m.div>
      )}
    </m.div>
  );
}
