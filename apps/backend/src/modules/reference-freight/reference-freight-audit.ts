import type { Prisma } from "@prisma/client";
import type { ReferenceFreightAuditAction } from "@dmx/contracts/reference-freight";

type Db = {
  referenceFreightRateAudit: {
    create: (args: {
      data: {
        rateId: string | null;
        action: string;
        actorUserId: string | null;
        snapshot: Prisma.InputJsonValue;
      };
    }) => Promise<unknown>;
  };
};

export async function logReferenceFreightAudit(
  db: Db,
  input: {
    rateId: string | null;
    action: ReferenceFreightAuditAction;
    actorUserId: string | null;
    snapshot: Record<string, unknown>;
  },
) {
  await db.referenceFreightRateAudit.create({
    data: {
      rateId: input.rateId,
      action: input.action,
      actorUserId: input.actorUserId,
      snapshot: input.snapshot as Prisma.InputJsonValue,
    },
  });
}
