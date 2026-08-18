import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { Validation } from "../../lib/errors.js";
import { AUTH_ORG_SELECT, issueTokensForUser, toUserDTO } from "./auth.service.js";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
export const GOOGLE_STATE_COOKIE = "dmx_google_state";
export function isGoogleAuthEnabled() {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
export function googleRedirectUri() {
    return `${env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/google/callback`;
}
export function buildGoogleAuthUrl(state) {
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: googleRedirectUri(),
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
        access_type: "online",
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}
export function newGoogleOAuthState() {
    return crypto.randomBytes(24).toString("base64url");
}
async function exchangeCodeForTokens(code) {
    const body = new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri(),
        grant_type: "authorization_code",
    });
    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        throw Validation(data.error ?? "Google token exchange failed");
    }
    return data;
}
async function fetchGoogleUserInfo(accessToken) {
    const res = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok || !data.sub) {
        throw Validation(data.error ?? "Could not load Google profile");
    }
    return data;
}
function defaultOrganisationName(email, displayName) {
    const domain = email.split("@")[1]?.split(".")[0]?.toLowerCase();
    const personalDomains = new Set(["gmail", "yahoo", "hotmail", "outlook", "icloud", "mail", "live", "msn"]);
    if (domain && !personalDomains.has(domain)) {
        return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    const first = displayName.trim().split(/\s+/)[0] || "My";
    return `${first} Company`;
}
async function randomPasswordHash() {
    return bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
}
export async function loginOrRegisterWithGoogle(profile) {
    const email = profile.email?.trim().toLowerCase();
    if (!email || profile.email_verified === false) {
        throw Validation("Google account must have a verified email");
    }
    if (email.endsWith("@demaxtore.com") || email.endsWith("@demaxtore.local")) {
        throw Validation("Use your company email address");
    }
    const displayName = (profile.name?.trim() || email.split("@")[0] || "User").slice(0, 120);
    const avatarUrl = profile.picture ?? null;
    const googleId = profile.sub;
    let user = await prisma.user.findFirst({
        where: { OR: [{ googleId }, { email }] },
        include: { organisation: { select: AUTH_ORG_SELECT } },
    });
    if (user) {
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                googleId: user.googleId ?? googleId,
                displayName: user.displayName || displayName,
                avatarUrl: user.avatarUrl ?? avatarUrl,
            },
            include: { organisation: { select: AUTH_ORG_SELECT } },
        });
    }
    else {
        const passwordHash = await randomPasswordHash();
        user = await prisma.$transaction(async (tx) => {
            const organisation = await tx.organisation.create({
                data: {
                    name: defaultOrganisationName(email, displayName),
                    kind: "BUYER_ORG",
                },
            });
            return tx.user.create({
                data: {
                    email,
                    passwordHash,
                    displayName,
                    role: "BUYER",
                    organisationId: organisation.id,
                    googleId,
                    avatarUrl,
                },
                include: { organisation: { select: AUTH_ORG_SELECT } },
            });
        });
    }
    const tokens = await issueTokensForUser(user);
    return { ...tokens, user: toUserDTO(user) };
}
export async function completeGoogleOAuth(code) {
    const tokenData = await exchangeCodeForTokens(code);
    const profile = await fetchGoogleUserInfo(tokenData.access_token);
    return loginOrRegisterWithGoogle(profile);
}
//# sourceMappingURL=google-oauth.js.map