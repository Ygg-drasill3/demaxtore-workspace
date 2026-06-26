// apps/frontend/src/components/ui/EmptyState.tsx
import { type ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  icon?:    ReactNode;
  title:    string;
  body?:    string;
  action?:  ReactNode;
  testId?:  string;
}

export function EmptyState({ icon, title, body, action, testId = "empty-state" }: Props) {
  return (
    <div data-testid={testId} className="dmx-card p-10 flex flex-col items-center text-center gap-3 animate-fade-in">
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
