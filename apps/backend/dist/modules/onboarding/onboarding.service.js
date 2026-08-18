import { buildChecklist, computeCompletionPercent, computeOnboardingJourney, computeTradeMilestones, nextActionForStep, stepsForRole, OnboardingAuditAction, } from "@dmx/contracts/onboarding";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { buildJourneyContext, buildTradeMilestoneSignals } from "./onboarding.engine.js";
import { onboardingAudit } from "./onboarding-audit.js";
function toOnboardingRole(role) {
    return role;
}
function deriveStatus(completed, currentStep, started) {
    if (completed)
        return "COMPLETED";
    if (!started && !currentStep)
        return "NOT_STARTED";
    return "IN_PROGRESS";
}
export class OnboardingService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getOrSyncProgress(userId, role) {
        const onboardingRole = toOnboardingRole(role);
        const ctx = await buildJourneyContext(this.db, userId, onboardingRole);
        const journey = computeOnboardingJourney(ctx);
        const milestones = computeTradeMilestones(await buildTradeMilestoneSignals(this.db, userId, onboardingRole, ctx));
        let row = await this.db.userOnboardingProgress.findUnique({ where: { userId } });
        const now = new Date();
        const wasCompleted = row?.completed ?? false;
        const wasFirstTrade = row?.firstTradeCompleted ?? false;
        if (!row) {
            const allDone = journey.currentStep === null && journey.completedSteps.length >= stepsForRole(onboardingRole).length;
            row = await this.db.userOnboardingProgress.create({
                data: {
                    userId,
                    role,
                    completedSteps: journey.completedSteps,
                    currentStep: journey.currentStep,
                    completed: allDone,
                    firstTradeCompleted: journey.firstTradeCompleted,
                    startedAt: now,
                    firstTradeAt: journey.firstTradeCompleted ? now : null,
                    completedAt: allDone ? now : null,
                },
            });
            await onboardingAudit(this.db, userId, OnboardingAuditAction.STARTED, { role });
            socketBus.emitToUser(userId, SocketEvents.ONBOARDING_UPDATED, { userId });
        }
        else {
            const allDone = journey.currentStep === null && journey.completedSteps.length >= stepsForRole(onboardingRole).length;
            row = await this.db.userOnboardingProgress.update({
                where: { userId },
                data: {
                    completedSteps: journey.completedSteps,
                    currentStep: journey.currentStep,
                    completed: allDone,
                    firstTradeCompleted: journey.firstTradeCompleted,
                    startedAt: row.startedAt ?? now,
                    completedAt: allDone && !row.completed ? now : row.completedAt,
                    firstTradeAt: journey.firstTradeCompleted && !row.firstTradeCompleted ? now : row.firstTradeAt,
                },
            });
            if (!wasCompleted && allDone) {
                await onboardingAudit(this.db, userId, OnboardingAuditAction.COMPLETED, { role });
            }
            if (!wasFirstTrade && journey.firstTradeCompleted) {
                await onboardingAudit(this.db, userId, OnboardingAuditAction.FIRST_TRADE, { role });
                socketBus.emitToUser(userId, SocketEvents.FIRST_TRADE_COMPLETED, { userId, role });
            }
            socketBus.emitToUser(userId, SocketEvents.ONBOARDING_UPDATED, { userId });
        }
        const status = deriveStatus(row.completed, row.currentStep, !!row.startedAt);
        const completionPercent = computeCompletionPercent(onboardingRole, journey.completedSteps);
        return {
            userId,
            role: onboardingRole,
            status,
            completedSteps: journey.completedSteps,
            currentStep: journey.currentStep,
            completed: row.completed,
            firstTradeCompleted: row.firstTradeCompleted,
            completionPercent,
            checklist: buildChecklist(onboardingRole, journey.completedSteps, journey.currentStep),
            nextAction: nextActionForStep(onboardingRole, journey.currentStep),
            milestones,
            tourCompleted: row.tourCompleted,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }
    async completeTour(userId) {
        await this.db.userOnboardingProgress.upsert({
            where: { userId },
            create: { userId, role: "BUYER", tourCompleted: true, tourCompletedAt: new Date(), startedAt: new Date() },
            update: { tourCompleted: true, tourCompletedAt: new Date() },
        });
        await onboardingAudit(this.db, userId, OnboardingAuditAction.TOUR_COMPLETED, {});
        socketBus.emitToUser(userId, SocketEvents.ONBOARDING_UPDATED, { userId });
    }
    async recordLearningOpen(userId, contentId) {
        await onboardingAudit(this.db, userId, OnboardingAuditAction.LEARNING_OPENED, { contentId });
    }
    async getDashboardMetrics() {
        const rows = await this.db.userOnboardingProgress.findMany({
            select: {
                role: true,
                completed: true,
                firstTradeCompleted: true,
                startedAt: true,
                completedAt: true,
            },
        });
        const roleBreakdown = {
            BUYER: { total: 0, completed: 0, firstTrade: 0 },
            SUPPLIER: { total: 0, completed: 0, firstTrade: 0 },
            ADMIN: { total: 0, completed: 0, firstTrade: 0 },
            SALES_CONTROL: { total: 0, completed: 0, firstTrade: 0 },
        };
        let totalHours = 0;
        let completedWithTime = 0;
        for (const r of rows) {
            const rb = roleBreakdown[toOnboardingRole(r.role)];
            if (!rb)
                continue;
            rb.total++;
            if (r.completed)
                rb.completed++;
            if (r.firstTradeCompleted)
                rb.firstTrade++;
            if (r.startedAt && r.completedAt) {
                totalHours += (r.completedAt.getTime() - r.startedAt.getTime()) / 3_600_000;
                completedWithTime++;
            }
        }
        return {
            usersOnboarded: rows.filter((r) => r.startedAt).length,
            usersCompletedOnboarding: rows.filter((r) => r.completed).length,
            firstTradeCompleted: rows.filter((r) => r.firstTradeCompleted).length,
            averageCompletionHours: completedWithTime > 0 ? Math.round((totalHours / completedWithTime) * 10) / 10 : null,
            roleBreakdown,
        };
    }
    async listAllProgress() {
        const rows = await this.db.userOnboardingProgress.findMany({
            take: 200,
            orderBy: { updatedAt: "desc" },
        });
        return rows.map((row) => this.rowToProgressDto(row));
    }
    /** Map persisted row to DTO without live sync (admin list / CSV). */
    rowToProgressDto(row) {
        const onboardingRole = toOnboardingRole(row.role);
        return {
            userId: row.userId,
            role: onboardingRole,
            status: deriveStatus(row.completed, row.currentStep, !!row.startedAt),
            completedSteps: row.completedSteps,
            currentStep: row.currentStep,
            completed: row.completed,
            firstTradeCompleted: row.firstTradeCompleted,
            completionPercent: computeCompletionPercent(onboardingRole, row.completedSteps),
            checklist: buildChecklist(onboardingRole, row.completedSteps, row.currentStep),
            nextAction: nextActionForStep(onboardingRole, row.currentStep),
            milestones: [],
            tourCompleted: row.tourCompleted,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }
}
//# sourceMappingURL=onboarding.service.js.map