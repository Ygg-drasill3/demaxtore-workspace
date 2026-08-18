import { env } from "../../config/env.js";
import { getIo } from "../../realtime/socket.js";
import { getSocketAdapterStatus } from "../../realtime/socket-adapter.js";
import { JobService } from "./job.service.js";
import { StorageHealthService } from "./storage-health.service.js";
import { BackupVerificationService } from "./backup-verification.service.js";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
export class SystemHealthService {
    db;
    jobService;
    storage;
    backup;
    constructor(db) {
        this.db = db;
        this.jobService = new JobService(db);
        this.storage = new StorageHealthService(db);
        this.backup = new BackupVerificationService(db);
    }
    async getDetailedHealth() {
        const components = await this.collectComponents();
        const down = components.filter((c) => c.status === "down").length;
        const degraded = components.filter((c) => c.status === "degraded").length;
        const overall = down > 0 ? "critical" : degraded > 0 ? "degraded" : "healthy";
        const snapshot = {
            overall,
            checkedAt: new Date().toISOString(),
            uptimeSec: Math.floor(process.uptime()),
            components,
        };
        socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_HEALTH_UPDATED, { overall });
        return snapshot;
    }
    async collectComponents() {
        const [api, dbComp, socket, scheduler, jobsComp, tracking, email, storage] = await Promise.all([
            this.apiHealth(),
            this.dbHealth(),
            this.socketHealth(),
            this.schedulerHealth(),
            this.checkJobsHealth(),
            this.trackingHealth(),
            this.emailHealth(),
            this.storage.componentHealth(),
        ]);
        return [api, dbComp, socket, scheduler, jobsComp, tracking, email, storage];
    }
    apiHealth() {
        return { key: "api", label: "API Health", status: "up", detail: "Process responding" };
    }
    async dbHealth() {
        try {
            await this.db.$queryRaw `SELECT 1`;
            return { key: "db", label: "DB Health", status: "up" };
        }
        catch (e) {
            return {
                key: "db",
                label: "DB Health",
                status: "down",
                detail: e instanceof Error ? e.message : "unreachable",
            };
        }
    }
    socketHealth() {
        try {
            const io = getIo();
            const { adapter, redisConnected } = getSocketAdapterStatus();
            const detail = adapter === "redis"
                ? `Redis adapter${redisConnected ? "" : " (disconnected)"}`
                : "In-memory adapter";
            const status = adapter === "redis" && !redisConnected ? "degraded" : "up";
            return {
                key: "socket",
                label: "Socket Health",
                status: io ? status : "degraded",
                detail: io ? detail : "Not initialized",
            };
        }
        catch {
            return { key: "socket", label: "Socket Health", status: "degraded", detail: "Not initialized" };
        }
    }
    async schedulerHealth() {
        const schedulers = await this.jobService.getSchedulerStatuses();
        const stale = schedulers.filter((s) => s.stale);
        if (stale.length) {
            return {
                key: "scheduler",
                label: "Scheduler Health",
                status: "degraded",
                detail: `${stale.length} stale scheduler(s)`,
            };
        }
        return { key: "scheduler", label: "Scheduler Health", status: "up" };
    }
    async checkJobsHealth() {
        const [failed, stuck] = await Promise.all([
            this.jobService.getFailedJobs(),
            this.jobService.getStuckRunning(env.JOB_STALE_RUNNING_MS),
        ]);
        if (stuck.length > 0) {
            return {
                key: "jobs",
                label: "Job Health",
                status: "degraded",
                detail: `${stuck.length} stale RUNNING job(s) — run reconcile or wait for auto-reclaim`,
            };
        }
        if (failed.some((f) => f.failures >= 3)) {
            return {
                key: "jobs",
                label: "Job Health",
                status: "degraded",
                detail: "Repeated job failures detected",
            };
        }
        return { key: "jobs", label: "Job Health", status: "up" };
    }
    async trackingHealth() {
        const last = await this.db.jobExecution.findFirst({
            where: { jobName: "maritime_tracking_sync", status: "SUCCESS" },
            orderBy: { startedAt: "desc" },
        });
        const stale = !last ||
            Date.now() - last.startedAt.getTime() > env.TRACKING_SYNC_INTERVAL_MS * 2.5;
        return {
            key: "tracking",
            label: "Tracking Health",
            status: stale ? "degraded" : "up",
            detail: last ? `Last sync ${last.startedAt.toISOString()}` : "No successful sync yet",
        };
    }
    emailHealth() {
        const provider = env.EMAIL_PROVIDER;
        if (provider === "console") {
            return { key: "email", label: "Email Health", status: "up", detail: "Console provider (dev)" };
        }
        if (provider === "resend" && !env.RESEND_API_KEY) {
            return { key: "email", label: "Email Health", status: "down", detail: "RESEND_API_KEY missing" };
        }
        if (provider === "smtp" && (!env.SMTP_HOST || !env.SMTP_USER)) {
            return { key: "email", label: "Email Health", status: "degraded", detail: "SMTP incomplete" };
        }
        return { key: "email", label: "Email Health", status: "up", detail: provider };
    }
    async getDashboardInsight() {
        const health = await this.getDetailedHealth();
        const jobStatuses = await this.jobService.getJobStatuses();
        const failedJobs = await this.jobService.getFailedJobs();
        const schedulers = await this.jobService.getSchedulerStatuses();
        const storageReport = await this.storage.scan();
        const backupStatus = await this.backup.getStatus();
        const tracking = health.components.find((c) => c.key === "tracking");
        const email = health.components.find((c) => c.key === "email");
        return {
            health,
            jobs: jobStatuses,
            failedJobs,
            schedulers,
            storage: storageReport,
            backup: backupStatus,
            tracking,
            email,
        };
    }
}
//# sourceMappingURL=system-health.service.js.map