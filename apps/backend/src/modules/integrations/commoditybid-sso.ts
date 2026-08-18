import jwt from "jsonwebtoken";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout.js";
import type { RequestHandler } from "express";

const BRIDGE_TIMEOUT_MS = 8000;
const BRIDGE_SECRET = env.WORKSPACE_BRIDGE_SECRET ?? "";
const PANEL_BASE = (env.COMMODITYBID_PANEL_URL ?? "https://commoditybid.demaxtore.com/panel").replace(/\/$/, "");
const API_BASE = (env.COMMODITYBID_API_URL ?? PANEL_BASE.replace(/\/panel$/, "") + "/api").replace(/\/$/, "");
const DEFAULT_CREATE_PATH = (env.COMMODITYBID_CREATE_PATH ?? "/productionRequests/create").replace(/\/$/, "") || "/productionRequests/create";

/** Panel-internal path only — blocks open redirects. */
function sanitizeRedirect(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw.replace(/\/$/, "") || null;
}

function withEmbedQuery(
  path: string,
  opts: { embed: string | null; compact: string | null },
): string {
  const qIdx = path.indexOf("?");
  const base = qIdx >= 0 ? path.slice(0, qIdx) : path;
  const params = new URLSearchParams(qIdx >= 0 ? path.slice(qIdx + 1) : "");
  if (opts.embed) params.set("embed", opts.embed);
  if (opts.compact) params.set("compact", opts.compact);
  const qs = params.toString();
  return `${base}${qs ? `?${qs}` : ""}`;
}

function buildPanelEmbedUrl(
  next: string,
  token: string,
  opts: { embed: string | null; compact: string | null; refreshToken?: string | null },
): string {
  const qIdx = next.indexOf("?");
  const path = qIdx >= 0 ? next.slice(0, qIdx) : next;
  const destParams = new URLSearchParams(qIdx >= 0 ? next.slice(qIdx + 1) : "");
  if (opts.embed) destParams.set("embed", opts.embed);
  if (opts.compact) destParams.set("compact", opts.compact);
  destParams.set("cb_t", token);
  if (opts.refreshToken) destParams.set("cb_rt", opts.refreshToken);
  const qs = destParams.toString();
  return `${PANEL_BASE}${path}?${qs}`;
}

/** Workspace oturumu → CommodityBid iframe SSO token */
export const commoditybidSso: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!BRIDGE_SECRET) {
      res.status(503).json({ message: "CommodityBid SSO not configured" });
      return;
    }

    const authUser = req.user!;
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { email: true, role: true, displayName: true },
    });
    if (!dbUser) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const sso = jwt.sign(
      {
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.displayName,
        sub: authUser.id,
        jti: `${authUser.id}:${Date.now()}`,
      },
      BRIDGE_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "300s",
        issuer: "workspace.demaxtore.com",
        audience: "commoditybid.demaxtore.com",
      },
    );

    const rawNext =
      sanitizeRedirect(req.query.next) ??
      sanitizeRedirect(req.query.redirect) ??
      sanitizeRedirect(req.query.path);
    const embed = req.query.embed === "workspace" ? "workspace" : null;
    const compact = req.query.compact === "1" ? "1" : null;
    const next = rawNext ? withEmbedQuery(rawNext, { embed, compact }) : null;
    const bridgeParams = new URLSearchParams({ sso });
    if (next) bridgeParams.set("next", next);
    if (embed) bridgeParams.set("embed", embed);
    if (compact) bridgeParams.set("compact", compact);
    const bridgeUrl = `${PANEL_BASE}/auth/bridge?${bridgeParams.toString()}`;

    // Prefer server-side token exchange + cb_t embed URL so the iframe does not
    // depend on the client /auth/bridge hop (often blocked / races to sign-in).
    let embedUrl: string | null = null;
    try {
      const bridgeRes = await fetchWithTimeout(`${API_BASE}/auth/workspace-sso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sso }),
        timeoutMs: BRIDGE_TIMEOUT_MS,
      });
      if (bridgeRes.ok) {
        const bridged = (await bridgeRes.json()) as { token?: string; refreshToken?: string };
        if (bridged.token && next) {
          embedUrl = buildPanelEmbedUrl(next, bridged.token, {
            embed,
            compact,
            refreshToken: bridged.refreshToken ?? null,
          });
        }
      } else {
        logger.warn(
          { status: bridgeRes.status, apiBase: API_BASE },
          "CommodityBid workspace-sso returned non-OK status",
        );
      }
    } catch (err) {
      logger.warn({ err, apiBase: API_BASE }, "CommodityBid workspace-sso request failed or timed out");
    }

    res.json({
      sso,
      next: next ?? null,
      redirect: next ?? null,
      bridgeUrl,
      embedUrl,
      createPath: DEFAULT_CREATE_PATH,
    });
  }),
];
