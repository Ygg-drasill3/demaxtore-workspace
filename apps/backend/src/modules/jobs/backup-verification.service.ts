import type { PrismaClient } from "@prisma/client";
import type { BackupVerificationStatus } from "@dmx/contracts/enterprise-readiness";
import { systemAudit } from "./system-audit.js";

const BACKUP_MAX_AGE_DAYS = 14;
const RESTORE_MAX_AGE_DAYS = 90;

export class BackupVerificationService {
  constructor(private readonly db: PrismaClient) {}

  async getStatus(): Promise<BackupVerificationStatus> {
    const [lastBackup, lastRestore] = await Promise.all([
      this.db.backupVerificationRecord.findFirst({
        where: { checkType: "backup" },
        orderBy: { verifiedAt: "desc" },
      }),
      this.db.backupVerificationRecord.findFirst({
        where: { checkType: "restore" },
        orderBy: { verifiedAt: "desc" },
      }),
    ]);

    const backupAge = lastBackup
      ? Date.now() - lastBackup.verifiedAt.getTime()
      : Number.POSITIVE_INFINITY;
    const restoreAge = lastRestore
      ? Date.now() - lastRestore.verifiedAt.getTime()
      : Number.POSITIVE_INFINITY;

    const backupOverdue = backupAge > BACKUP_MAX_AGE_DAYS * 86_400_000;
    const restoreUnverified = restoreAge > RESTORE_MAX_AGE_DAYS * 86_400_000;

    return {
      lastBackupCheck: lastBackup?.verifiedAt.toISOString() ?? null,
      lastBackupStatus: lastBackup?.status ?? null,
      lastRestoreCheck: lastRestore?.verifiedAt.toISOString() ?? null,
      lastRestoreStatus: lastRestore?.status ?? null,
      backupOverdue,
      restoreUnverified,
      notes: lastBackup?.notes ?? lastRestore?.notes ?? null,
    };
  }

  async recordCheck(params: {
    checkType: "backup" | "restore";
    status: "ok" | "failed" | "pending";
    notes?: string;
    verifiedById?: string;
  }) {
    const row = await this.db.backupVerificationRecord.create({
      data: {
        checkType: params.checkType,
        status: params.status,
        notes: params.notes,
        verifiedById: params.verifiedById,
      },
    });

    const action = params.checkType === "backup" ? "backup.verified" : "restore.verified";
    await systemAudit(this.db, action, {
      status: params.status,
      notes: params.notes,
      id: row.id,
    });

    return row;
  }
}
