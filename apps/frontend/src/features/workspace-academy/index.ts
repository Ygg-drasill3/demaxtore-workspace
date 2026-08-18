import type { ReactNode } from "react";

/** Minimal stub — academy feature sources were incomplete in this workspace snapshot. */
export function WorkspaceAcademyRoot({ children }: { children?: ReactNode }) {
  return children ?? null;
}

export function WorkspaceAcademyProvider({ children }: { children: ReactNode }) {
  return children;
}

export default WorkspaceAcademyRoot;

export function showRfqSubmittedSuccess(..._args: any[]) { return null as any; }

export function showPoIssuedSuccess(..._args: any[]) { return null as any; }
