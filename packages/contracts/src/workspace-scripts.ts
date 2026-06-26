// Shared workspace script types — Sprint Buyer Premium UX

export type ScriptMood = "active" | "waiting" | "action" | "returned" | "terminal-plus" | "terminal-minus";

export type WorkspaceScriptRole = "BUYER" | "SUPPLIER" | "ADMIN";

/** Maps platform actor roles to workspace script roles (SYSTEM has no scripts). */
export function toWorkspaceScriptRole(role: string): WorkspaceScriptRole | undefined {
  if (role === "BUYER" || role === "SUPPLIER" || role === "ADMIN") return role;
  return undefined;
}

export interface WorkspaceScript {
  mood: ScriptMood;
  past: string;
  future: string;
  statL: { label: string; value: string };
  statR: { label: string; value: string };
  /** Action key resolved by workspace-specific next-actions computer */
  primaryAction: string | null;
  primaryLabel?: string;
  fallbackPrimary?: { label: string; href?: string; action?: string; tone?: "secondary" | "ghost" };
}

export function formatScript<T extends Record<string, string | number | null | undefined>>(
  text: string,
  vars: T,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k as keyof T];
    return v == null ? `{{${k}}}` : String(v);
  });
}

export interface WorkspaceMilestone {
  key: string;
  label: string;
  status: "done" | "current" | "pending";
}
