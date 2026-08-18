import type { PrismaClient } from "@prisma/client";
import type { ReviewPhoneInput, SubmitPhoneInput } from "@dmx/contracts/phone-verification";
import { Forbidden, NotFound, Validation } from "../../lib/errors.js";
import type { AuthUser } from "../../types/auth-user.js";
import {
  assertCanSendMessages,
  canUserSendMessages,
  normalizePhoneInput,
  PENDING_PHONE_VERIFICATION,
  PHONE_REJECTED,
  PHONE_VERIFIED,
  requiresPhoneVerification,
} from "./phone-verification.policy.js";

function mapRequest(row: {
  id: string;
  userId: string;
  phone: string;
  status: string;
  notes: string | null;
  submittedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  user: {
    id: string;
    displayName: string;
    email: string;
    role: string;
    organisation: { name: string } | null;
  };
}) {
  return {
    id: row.id,
    userId: row.userId,
    phone: row.phone,
    status: row.status as "PENDING" | "APPROVED" | "REJECTED",
    notes: row.notes,
    submittedAt: row.submittedAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    user: {
      id: row.user.id,
      displayName: row.user.displayName,
      email: row.user.email,
      role: row.user.role,
      organisation: row.user.organisation?.name ?? null,
    },
  };
}

export async function notifyAdminsPhoneSubmitted(
  db: PrismaClient,
  requestId: string,
  actor: AuthUser,
  phone: string,
) {
  const admins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SALES_CONTROL", "SUPER_ADMIN"] } },
    select: { id: true },
    take: 50,
  });
  for (const admin of admins) {
    await db.notification.create({
      data: {
        userId: admin.id,
        type: "INFO",
        eventType: "PHONE_VERIFICATION_PENDING",
        title: "Phone verification pending",
        message: `${actor.email} submitted ${phone} for verification`,
        link: `/admin/phone-verifications?request=${requestId}`,
        metadata: { requestId, userId: actor.id, phone },
      },
    });
  }
}

export class PhoneVerificationService {
  constructor(private readonly db: PrismaClient) {}

  async getMe(actor: AuthUser) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: {
        phoneNumber: true,
        phoneVerificationStatus: true,
        role: true,
      },
    });
    const pending = await this.db.phoneVerificationRequest.findFirst({
      where: { userId: actor.id, status: "PENDING" },
      orderBy: { submittedAt: "desc" },
      include: {
        user: { include: { organisation: { select: { name: true } } } },
      },
    });
    return {
      phoneNumber: user.phoneNumber,
      phoneVerificationStatus: user.phoneVerificationStatus as
        | "PENDING_PHONE_VERIFICATION"
        | "PHONE_VERIFIED"
        | "PHONE_REJECTED"
        | null,
      canMessage: canUserSendMessages({
        role: user.role,
        phoneNumber: user.phoneNumber,
        phoneVerificationStatus: user.phoneVerificationStatus,
      }),
      pendingRequest: pending ? mapRequest(pending) : null,
    };
  }

  async submitPhone(actor: AuthUser, input: SubmitPhoneInput) {
    if (!requiresPhoneVerification(actor.role)) {
      throw Forbidden("Phone verification not required for this role");
    }
    const phone = normalizePhoneInput(input.phone);

    const user = await this.db.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { phoneNumber: true, phoneVerificationStatus: true },
    });

    if (user.phoneNumber === phone && user.phoneVerificationStatus === PHONE_VERIFIED) {
      const approved = await this.db.phoneVerificationRequest.findFirst({
        where: { userId: actor.id, status: "APPROVED", phone },
        orderBy: { approvedAt: "desc" },
        include: { user: { include: { organisation: { select: { name: true } } } } },
      });
      if (approved) return mapRequest(approved);
    }

    const existingPending = await this.db.phoneVerificationRequest.findFirst({
      where: { userId: actor.id, status: "PENDING" },
      include: { user: { include: { organisation: { select: { name: true } } } } },
    });
    if (existingPending) {
      if (existingPending.phone === phone) return mapRequest(existingPending);
      throw Validation("A phone verification request is already pending");
    }

    const row = await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.id },
        data: {
          phoneNumber: phone,
          phoneVerificationStatus: PENDING_PHONE_VERIFICATION,
          phoneVerifiedAt: null,
          phoneVerifiedBy: null,
        },
      });
      return tx.phoneVerificationRequest.create({
        data: { userId: actor.id, phone, status: "PENDING" },
        include: { user: { include: { organisation: { select: { name: true } } } } },
      });
    });

    void notifyAdminsPhoneSubmitted(this.db, row.id, actor, phone).catch(() => undefined);
    return mapRequest(row);
  }

  async listQueue(actor: AuthUser, opts?: { status?: string; limit?: number; offset?: number }) {
    if (actor.role !== "ADMIN" && actor.role !== "SALES_CONTROL" && actor.role !== "SUPER_ADMIN") {
      throw Forbidden("Admin access required");
    }
    const status = opts?.status ?? "PENDING";
    const limit = Math.min(opts?.limit ?? 50, 100);
    const offset = opts?.offset ?? 0;
    const where = status === "ALL" ? {} : { status };

    const [items, total] = await Promise.all([
      this.db.phoneVerificationRequest.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        take: limit,
        skip: offset,
        include: { user: { include: { organisation: { select: { name: true } } } } },
      }),
      this.db.phoneVerificationRequest.count({ where }),
    ]);

    return { items: items.map(mapRequest), total };
  }

  async approve(actor: AuthUser, requestId: string, input?: ReviewPhoneInput) {
    this.assertReviewer(actor);
    const req = await this.db.phoneVerificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!req) throw NotFound("Verification request not found");
    if (req.status !== "PENDING") throw Validation("Request is not pending");

    const now = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.phoneVerificationRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          approvedAt: now,
          approvedBy: actor.id,
          notes: input?.notes ?? req.notes,
        },
      });
      await tx.user.update({
        where: { id: req.userId },
        data: {
          phoneNumber: req.phone,
          whatsappPhone: req.phone,
          phoneVerificationStatus: PHONE_VERIFIED,
          phoneVerifiedAt: now,
          phoneVerifiedBy: actor.id,
        },
      });
    });

    return { ok: true };
  }

  async reject(actor: AuthUser, requestId: string, input?: ReviewPhoneInput) {
    this.assertReviewer(actor);
    const req = await this.db.phoneVerificationRequest.findUnique({ where: { id: requestId } });
    if (!req) throw NotFound("Verification request not found");
    if (req.status !== "PENDING") throw Validation("Request is not pending");

    const now = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.phoneVerificationRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectedAt: now,
          rejectedBy: actor.id,
          notes: input?.notes ?? null,
        },
      });
      await tx.user.update({
        where: { id: req.userId },
        data: { phoneVerificationStatus: PHONE_REJECTED },
      });
    });

    return { ok: true };
  }

  async pendingCount() {
    return this.db.phoneVerificationRequest.count({ where: { status: "PENDING" } });
  }

  private assertReviewer(actor: AuthUser) {
    if (actor.role !== "ADMIN" && actor.role !== "SALES_CONTROL" && actor.role !== "SUPER_ADMIN") {
      throw Forbidden("Admin access required");
    }
  }
}

export { assertCanSendMessages, canUserSendMessages };
