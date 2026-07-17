import type { PrismaClient, User } from "@prisma/client";
import { Forbidden, Validation } from "../../lib/errors.js";
import { normalizePhone } from "../chat/whatsapp.service.js";

export const PHONE_VERIFIED = "PHONE_VERIFIED" as const;
export const PENDING_PHONE_VERIFICATION = "PENDING_PHONE_VERIFICATION" as const;
export const PHONE_REJECTED = "PHONE_REJECTED" as const;

const MESSAGING_ROLES = new Set(["BUYER", "SUPPLIER"]);

export function requiresPhoneVerification(role: string): boolean {
  return MESSAGING_ROLES.has(role);
}

export function canUserSendMessages(user: Pick<User, "role" | "phoneVerificationStatus" | "phoneNumber">): boolean {
  if (!requiresPhoneVerification(user.role)) return true;
  return user.phoneVerificationStatus === PHONE_VERIFIED && Boolean(user.phoneNumber?.trim());
}

export function assertCanSendMessages(user: Pick<User, "role" | "phoneVerificationStatus" | "phoneNumber">): void {
  if (canUserSendMessages(user)) return;
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

export async function loadUserMessagingGate(db: PrismaClient, userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, role: true, phoneNumber: true, phoneVerificationStatus: true },
  });
  return user;
}

export function normalizePhoneInput(raw: string): string {
  const normalized = normalizePhone(raw.trim());
  if (!normalized) throw Validation("Invalid phone number — use E.164 format e.g. +905551234567");
  return normalized;
}
