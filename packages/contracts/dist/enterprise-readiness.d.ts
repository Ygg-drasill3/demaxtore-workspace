export type JobExecutionStatus = "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
export interface JobRegistryEntry {
    name: string;
    label: string;
    description: string;
    intervalMs: number;
    advisoryLockId: string | null;
    enabled: boolean;
    category: "email" | "scheduler" | "scan" | "sync" | "analytics";
}
export interface JobExecutionRecord {
    id: string;
    jobName: string;
    startedAt: string;
    finishedAt: string | null;
    status: JobExecutionStatus;
    durationMs: number | null;
    errorMessage: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}
export interface JobStatusSummary {
    job: JobRegistryEntry;
    lastRun: JobExecutionRecord | null;
    lastSuccess: JobExecutionRecord | null;
    lastFailure: JobExecutionRecord | null;
    nextRunEstimate: string | null;
    consecutiveFailures: number;
    stale: boolean;
}
export interface SchedulerStatus {
    name: string;
    lockId: string;
    intervalMs: number;
    healthy: boolean;
    lastTickAt: string | null;
    stale: boolean;
    missedExecutions: number;
}
export interface HealthComponentStatus {
    key: string;
    label: string;
    status: "up" | "degraded" | "down" | "unknown";
    detail?: string;
}
export interface SystemHealthSnapshot {
    overall: "healthy" | "degraded" | "critical";
    checkedAt: string;
    uptimeSec: number;
    components: HealthComponentStatus[];
}
export interface StorageHealthReport {
    storageDir: string;
    accessible: boolean;
    totalReferences: number;
    missingFiles: number;
    brokenReferences: number;
    driftDetected: boolean;
    samples: Array<{
        kind: string;
        id: string;
        storageKey: string;
        ok: boolean;
    }>;
}
export interface BackupVerificationStatus {
    lastBackupCheck: string | null;
    lastBackupStatus: string | null;
    lastRestoreCheck: string | null;
    lastRestoreStatus: string | null;
    backupOverdue: boolean;
    restoreUnverified: boolean;
    notes: string | null;
}
export interface FailedJobSummary {
    jobName: string;
    failures: number;
    lastError: string | null;
    lastFailedAt: string | null;
    longRunning: boolean;
}
export interface SystemDashboardInsight {
    health: SystemHealthSnapshot;
    jobs: JobStatusSummary[];
    failedJobs: FailedJobSummary[];
    schedulers: SchedulerStatus[];
    storage: StorageHealthReport;
    backup: BackupVerificationStatus;
    tracking: HealthComponentStatus;
    email: HealthComponentStatus;
}
