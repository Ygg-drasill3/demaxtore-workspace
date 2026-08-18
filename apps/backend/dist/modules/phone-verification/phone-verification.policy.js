import { Forbidden, Validation } from "../../lib/errors.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
export const PHONE_VERIFIED = "PHONE_VERIFIED";
export const PENDING_PHONE_VERIFICATION = "PENDING_PHONE_VERIFICATION";
export const PHONE_REJECTED = "PHONE_REJECTED";
const MESSAGING_ROLES = new Set(["BUYER", "SUPPLIER"]);
export function requiresPhoneVerification(role) {
    return MESSAGING_ROLES.has(role);
}
export function canUserSendMessages(user) {
    if (!requiresPhoneVerification(user.role))
        return true;
    return user.phoneVerificationStatus === PHONE_VERIFIED && Boolean(user.phoneNumber?.trim());
}
export function assertCanSendMessages(user, opts) {
    if (opts?.channel === "WORKSPACE")
        return;
    if (canUserSendMessages(user))
        return;
    if (!user.phoneNumber?.trim()) {
        throw Forbidden("PHONE_NUMBER_REQUIRED: Add and verify your phone number before messaging.");
    }
    if (user.phoneVerificationStatus === PENDING_PHONE_VERIFICATION) {
        throw Forbidden("PHONE_VERIFICATION_PENDING: Phone verification is pending admin approval.");
    }
    if (user.phoneVerificationStatus === PHONE_REJECTED) {
        throw Forbidden("PHONE_VERIFICATION_REJECTED: Phone verification was rejected. Submit a new number.");
    }
    throw Forbidden("PHONE_NOT_VERIFIED: Phone verification required.");
}
export async function loadUserMessagingGate(db, userId) {
    const user = await db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, role: true, phoneNumber: true, phoneVerificationStatus: true },
    });
    return user;
}
export function normalizePhoneInput(raw) {
    if (typeof raw !== "string") {
        throw Validation("Phone number is required — use E.164 format e.g. +905551234567");
    }
    const normalized = normalizePhone(raw.trim());
    if (!normalized)
        throw Validation("Invalid phone number — use E.164 format e.g. +905551234567");
    return normalized;
}
//# sourceMappingURL=phone-verification.policy.js.map