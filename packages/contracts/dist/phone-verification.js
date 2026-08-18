import { z } from "zod";
import { RoleEnum } from "./auth.js";
export const PhoneVerificationStatusEnum = z.enum([
    "PENDING_PHONE_VERIFICATION",
    "PHONE_VERIFIED",
    "PHONE_REJECTED",
]);
export const PhoneVerificationRequestStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const SubmitPhoneInput = z.object({
    phone: z.string().trim().min(8).max(20),
});
export const PhoneVerificationRequestDto = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    phone: z.string(),
    status: PhoneVerificationRequestStatusEnum,
    notes: z.string().nullable().optional(),
    submittedAt: z.string().datetime(),
    approvedAt: z.string().datetime().nullable().optional(),
    rejectedAt: z.string().datetime().nullable().optional(),
    user: z.object({
        id: z.string().uuid(),
        displayName: z.string(),
        email: z.string().email(),
        role: RoleEnum,
        organisation: z.string().nullable().optional(),
    }),
});
export const PhoneVerificationQueueResponse = z.object({
    items: z.array(PhoneVerificationRequestDto),
    total: z.number().int(),
});
export const ReviewPhoneInput = z.object({
    notes: z.string().max(2000).optional(),
});
export const PhoneVerificationMeResponse = z.object({
    phoneNumber: z.string().nullable(),
    phoneVerificationStatus: PhoneVerificationStatusEnum.nullable(),
    canMessage: z.boolean(),
    pendingRequest: PhoneVerificationRequestDto.nullable().optional(),
});
