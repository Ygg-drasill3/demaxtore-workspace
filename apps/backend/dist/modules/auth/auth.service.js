// apps/backend/src/modules/auth/auth.service.ts
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { InvalidCredentials, Unauthorized, Validation, TooManyRequests, Conflict, Forbidden } from "../../lib/errors.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, newJti, } from "./jwt.js";
import { checkLock, recordFailure, recordSuccess } from "./bruteforce.js";
import { resolveBuyerOperatingModel } from "@dmx/contracts/buyer-operating-model";
import { normalizePhoneInput, PENDING_PHONE_VERIFICATION } from "../phone-verification/phone-verification.policy.js";
import { notifyAdminsPhoneSubmitted } from "../phone-verification/phone-verification.service.js";
export const AUTH_ORG_SELECT = { name: true, buyerOperatingModel: true };
/** Public, serialisable user shape (matches @dmx/contracts UserDTO). */
export function toUserDTO(u) {
    return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        organisation: u.organisation?.name ?? null,
        avatarUrl: u.avatarUrl,
        phoneNumber: u.phoneNumber ?? null,
        phoneVerificationStatus: u.phoneVerificationStatus,
        createdAt: u.createdAt.toISOString(),
        buyerOperatingModel: resolveBuyerOperatingModel(u.organisation?.buyerOperatingModel),
    };
}
async function issueTokens(user) {
    const jti = newJti();
    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id, jti });
    await prisma.refreshToken.create({
        data: {
            id: jti,
            userId: user.id,
            tokenHash: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SEC * 1000),
        },
    });
    return { accessToken, refreshToken, expiresInSec: env.ACCESS_TOKEN_TTL_SEC };
}
export async function issueTokensForUser(user) {
    return issueTokens(user);
}
// ── login ────────────────────────────────────────────────────────────────────
export async function login(rawEmail, password, ip) {
    const email = rawEmail.trim().toLowerCase();
    const lock = await checkLock(ip, email);
    if (lock.locked) {
        throw TooManyRequests(`Too many failed attempts. Retry in ${lock.retryInSec}s.`);
    }
    const user = await prisma.user.findUnique({
        where: { email },
        include: { organisation: { select: AUTH_ORG_SELECT } },
    });
    if (!user) {
        await recordFailure(ip, email);
        throw InvalidCredentials();
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        await recordFailure(ip, email);
        throw InvalidCredentials();
    }
    await recordSuccess(ip, email);
    const tokens = await issueTokens(user);
    return { ...tokens, user: toUserDTO(user) };
}
// ── register (public — buyer self-service) ───────────────────────────────────
export async function register(input, ip) {
    const email = input.email.trim().toLowerCase();
    if (email.endsWith("@demaxtore.com") || email.endsWith("@demaxtore.local")) {
        throw Validation("Use your company email address");
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
        throw Conflict("An account with this email already exists");
    const passwordHash = await bcrypt.hash(input.password, 10);
    const phone = normalizePhoneInput(input.phone);
    const user = await prisma.$transaction(async (tx) => {
        const organisation = await tx.organisation.create({
            data: {
                name: input.organisationName.trim(),
                kind: "BUYER_ORG",
            },
        });
        const created = await tx.user.create({
            data: {
                email,
                passwordHash,
                displayName: input.displayName.trim(),
                role: "BUYER",
                organisationId: organisation.id,
                phoneNumber: phone,
                phoneVerificationStatus: PENDING_PHONE_VERIFICATION,
            },
            include: { organisation: { select: AUTH_ORG_SELECT } },
        });
        await tx.phoneVerificationRequest.create({
            data: { userId: created.id, phone, status: "PENDING" },
        });
        return created;
    });
    const req = await prisma.phoneVerificationRequest.findFirstOrThrow({
        where: { userId: user.id },
        orderBy: { submittedAt: "desc" },
    });
    void notifyAdminsPhoneSubmitted(prisma, req.id, { id: user.id, email: user.email, role: user.role }, phone).catch(() => undefined);
    await recordSuccess(ip, email);
    const tokens = await issueTokens(user);
    return { ...tokens, user: toUserDTO(user) };
}
// ── refresh (with rotation) ──────────────────────────────────────────────────
export async function refresh(rawRefreshToken) {
    let payload;
    try {
        payload = verifyRefreshToken(rawRefreshToken);
    }
    catch {
        throw Unauthorized("Invalid or expired refresh token");
    }
    const row = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
        throw Unauthorized("Refresh token revoked or expired");
    }
    if (row.tokenHash !== hashToken(rawRefreshToken)) {
        // Token reuse / mismatch — revoke all sessions for this user as a precaution.
        await prisma.refreshToken.updateMany({
            where: { userId: payload.sub, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        throw Unauthorized("Refresh token mismatch — all sessions revoked");
    }
    // Rotate: revoke old + issue new.
    await prisma.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: new Date() },
    });
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user)
        throw Unauthorized("User no longer exists");
    return await issueTokens(user);
}
// ── logout ───────────────────────────────────────────────────────────────────
export async function logout(rawRefreshToken) {
    if (!rawRefreshToken)
        return;
    try {
        const { jti } = verifyRefreshToken(rawRefreshToken);
        await prisma.refreshToken.updateMany({
            where: { id: jti, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    catch {
        // Best-effort: ignore invalid tokens on logout.
    }
}
// ── /me ──────────────────────────────────────────────────────────────────────
export async function getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organisation: { select: AUTH_ORG_SELECT } },
    });
    if (!user)
        throw Unauthorized("User not found");
    return toUserDTO(user);
}
/**
 * Every field is optional, matching `UpdateProfileInput`. Previously this took a required
 * `displayName` and called `.trim()` on it unconditionally, so a partial update — which the
 * contract advertises — threw a TypeError and surfaced as a 500. `phoneNumber` and
 * `avatarUrl` were validated and then silently dropped; both are now persisted, and an
 * explicit null clears them.
 */
export async function updateProfile(userId, input) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organisation: { select: AUTH_ORG_SELECT } },
    });
    if (!user)
        throw Unauthorized("User not found");
    if (!["BUYER", "SUPPLIER"].includes(user.role)) {
        throw Forbidden("Profile updates are only available for buyer and supplier accounts");
    }
    const data = {};
    if (input.displayName !== undefined)
        data.displayName = input.displayName.trim();
    if (input.phoneNumber !== undefined)
        data.phoneNumber = input.phoneNumber?.trim() ?? null;
    if (input.avatarUrl !== undefined)
        data.avatarUrl = input.avatarUrl ?? null;
    if (Object.keys(data).length === 0)
        return toUserDTO(user);
    const updated = await prisma.user.update({
        where: { id: userId },
        data,
        include: { organisation: { select: AUTH_ORG_SELECT } },
    });
    return toUserDTO(updated);
}
// ── forgot-password (always 200) ─────────────────────────────────────────────
/** Returns reset URL only when EMAIL_PROVIDER=console (no real inbox delivery). */
export async function forgotPassword(rawEmail) {
    const email = rawEmail.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return null; // generic — no enumeration
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
    });
    const resetUrl = `${env.APP_BASE_URL}/reset-password?token=${rawToken}`;
    // Dev console + email provider both informed (mailer falls back to console).
    logger.info({ email: user.email, resetUrl }, "📧 Password-reset link issued");
    const { forgotPasswordTemplate } = await import("../messaging/templates.js");
    const { mailer } = await import("../messaging/mailer.js");
    mailer.sendAsync({ to: user.email, ...forgotPasswordTemplate({ displayName: user.displayName, resetUrl }) });
    return env.EMAIL_PROVIDER === "console" ? resetUrl : null;
}
// ── reset-password ───────────────────────────────────────────────────────────
export async function resetPassword(rawToken, newPassword) {
    const tokenHash = hashToken(rawToken);
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.consumedAt || row.expiresAt < new Date()) {
        throw Validation("Invalid or expired reset token");
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
        prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
        prisma.passwordResetToken.update({ where: { id: row.id }, data: { consumedAt: new Date() } }),
        // Revoke all live refresh tokens — force re-login everywhere.
        prisma.refreshToken.updateMany({
            where: { userId: row.userId, revokedAt: null },
            data: { revokedAt: new Date() },
        }),
    ]);
}
//# sourceMappingURL=auth.service.js.map