import type { Request } from "express";

/** Routes passwordless sessions may call (conversation-only). */
export function isPasswordlessAllowedPath(req: Request): boolean {
  const method = req.method.toUpperCase();
  const path = (req.originalUrl ?? "").split("?")[0] ?? "";

  if (path.includes("/passwordless-access/")) return true;

  const convoMatch = path.match(/\/workspaces\/[^/]+\/[^/]+\/conversation(\/.*)?$/);
  if (!convoMatch) return false;

  if (method === "GET") return true;

  if (method === "POST") {
    return (
      path.endsWith("/conversation/timeline")
      || path.endsWith("/conversation/attachments")
      || path.endsWith("/conversation/timeline/delivered")
      || path.endsWith("/conversation/timeline/read")
      || /\/conversation\/timeline\/[^/]+\/pin$/.test(path)
    );
  }

  return false;
}
