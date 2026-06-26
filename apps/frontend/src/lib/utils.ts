// apps/frontend/src/lib/utils.ts
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware classname joiner. */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60)     return `${s}s ago`;
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
