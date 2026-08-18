import { ACADEMY_GUIDE_IDS, academyTaskById, academyTasksForRole, } from "@dmx/contracts/workspace-academy";
import { Validation } from "../../lib/errors.js";
const GUIDE_SET = new Set(ACADEMY_GUIDE_IDS);
export class WorkspaceAcademyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getState(userId, role) {
        const profile = await this.prisma.workspaceAcademyProfile.findUnique({ where: { userId } }).catch(() => null);
        const guides = await this.prisma.workspaceAcademyGuideProgress
            .findMany({ where: { userId } })
            .catch(() => []);
        const tasks = await this.prisma.workspaceAcademyTaskProgress
            .findMany({ where: { userId } })
            .catch(() => []);
        const articles = await this.prisma.workspaceAcademyArticleView
            .findMany({
            where: { userId },
            orderBy: { lastViewedAt: "desc" },
            take: 10,
            select: { articleId: true },
        })
            .catch(() => []);
        return {
            welcomeCompletedAt: profile?.welcomeCompletedAt?.toISOString?.() ?? null,
            welcomeDismissedAt: profile?.welcomeDismissedAt?.toISOString?.() ?? null,
            processOverviewCompletedAt: profile?.processOverviewCompletedAt?.toISOString?.() ?? null,
            checklistDismissedAt: profile?.checklistDismissedAt?.toISOString?.() ?? null,
            lastAutomaticGuideId: profile?.lastAutomaticGuideId ?? null,
            lastAutomaticGuideAt: profile?.lastAutomaticGuideAt?.toISOString?.() ?? null,
            guides: (guides ?? []).map((g) => ({
                guideId: g.guideId,
                guideVersion: g.guideVersion,
                status: g.status,
                lastStepIndex: g.lastStepIndex ?? 0,
                displayCount: g.displayCount ?? 0,
                startedAt: g.startedAt?.toISOString?.() ?? null,
                completedAt: g.completedAt?.toISOString?.() ?? null,
                dismissedAt: g.dismissedAt?.toISOString?.() ?? null,
            })),
            tasks: (tasks ?? []).map((t) => ({
                taskId: t.taskId,
                status: t.status,
                completedAt: t.completedAt?.toISOString?.() ?? null,
            })),
            recentArticleIds: articles.map((a) => a.articleId),
            availableTaskIds: academyTasksForRole(role).map((t) => t.id),
        };
    }
    /** Profile rows are created lazily, so every profile write is an upsert. */
    async markProfile(userId, data) {
        await this.prisma.workspaceAcademyProfile.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });
    }
    async completeWelcome(userId, language) {
        await this.markProfile(userId, {
            welcomeCompletedAt: new Date(),
            ...(language ? { language } : {}),
        });
    }
    async dismissWelcome(userId) {
        await this.markProfile(userId, { welcomeDismissedAt: new Date() });
    }
    async completeProcessOverview(userId) {
        await this.markProfile(userId, { processOverviewCompletedAt: new Date() });
    }
    async dismissChecklist(userId) {
        await this.markProfile(userId, { checklistDismissedAt: new Date() });
    }
    async dismissTask(userId, role, taskId) {
        const def = academyTaskById(taskId);
        if (!def)
            throw Validation(`Unknown academy task: ${taskId}`);
        if (!def.roles.includes(role)) {
            throw Validation(`Task ${taskId} is not available for role ${role}`);
        }
        await this.prisma.workspaceAcademyTaskProgress.upsert({
            where: { userId_taskId: { userId, taskId } },
            create: { userId, taskId, status: "DISMISSED" },
            update: { status: "DISMISSED" },
        });
    }
    async viewArticle(userId, articleId) {
        await this.prisma.workspaceAcademyArticleView.upsert({
            where: { userId_articleId: { userId, articleId } },
            create: { userId, articleId },
            update: { lastViewedAt: new Date(), viewCount: { increment: 1 } },
        });
    }
    async startGuide(userId, guideId, automatic = false, guideVersion = 1) {
        if (!GUIDE_SET.has(guideId))
            throw Validation(`Unknown guide id: ${guideId}`);
        await this.prisma.workspaceAcademyGuideProgress.upsert({
            where: { userId_guideId: { userId, guideId } },
            create: {
                userId,
                guideId,
                guideVersion,
                status: "STARTED",
                startedAt: new Date(),
                displayCount: 1,
                lastStepIndex: 0,
            },
            update: {
                status: "STARTED",
                guideVersion,
                startedAt: new Date(),
                displayCount: { increment: 1 },
            },
        });
        if (automatic) {
            await this.prisma.workspaceAcademyProfile.upsert({
                where: { userId },
                create: { userId, lastAutomaticGuideId: guideId, lastAutomaticGuideAt: new Date() },
                update: { lastAutomaticGuideId: guideId, lastAutomaticGuideAt: new Date() },
            });
        }
    }
    async progressGuide(userId, guideId, stepIndex) {
        if (!GUIDE_SET.has(guideId))
            throw Validation(`Unknown guide id: ${guideId}`);
        await this.prisma.workspaceAcademyGuideProgress.upsert({
            where: { userId_guideId: { userId, guideId } },
            create: {
                userId,
                guideId,
                guideVersion: 1,
                status: "STARTED",
                lastStepIndex: stepIndex,
                startedAt: new Date(),
                displayCount: 1,
            },
            update: { lastStepIndex: stepIndex },
        });
    }
    async completeGuide(userId, guideId, guideVersion = 1) {
        if (!GUIDE_SET.has(guideId))
            throw Validation(`Unknown guide id: ${guideId}`);
        await this.prisma.workspaceAcademyGuideProgress.upsert({
            where: { userId_guideId: { userId, guideId } },
            create: {
                userId,
                guideId,
                guideVersion,
                status: "COMPLETED",
                completedAt: new Date(),
                startedAt: new Date(),
                displayCount: 1,
                lastStepIndex: 0,
            },
            update: { status: "COMPLETED", completedAt: new Date(), guideVersion },
        });
    }
    async dismissGuide(userId, guideId, guideVersion = 1) {
        if (!GUIDE_SET.has(guideId))
            throw Validation(`Unknown guide id: ${guideId}`);
        await this.prisma.workspaceAcademyGuideProgress.upsert({
            where: { userId_guideId: { userId, guideId } },
            create: {
                userId,
                guideId,
                guideVersion,
                status: "DISMISSED",
                dismissedAt: new Date(),
                displayCount: 1,
                lastStepIndex: 0,
            },
            update: { status: "DISMISSED", dismissedAt: new Date(), guideVersion },
        });
    }
    async completeTask(userId, role, taskId) {
        const def = academyTaskById(taskId);
        if (!def)
            throw Validation(`Unknown academy task: ${taskId}`);
        if (!def.roles.includes(role)) {
            throw Validation(`Task ${taskId} is not available for role ${role}`);
        }
        if (def.verification === "DOMAIN") {
            // Best-effort: require at least one workspace owned/participated by user for RFQ-style tasks
            if (taskId.includes("rfq") || taskId.includes("first_rfq")) {
                const ws = await this.prisma.workspace.findFirst({
                    where: {
                        OR: [
                            { createdById: userId },
                            { participants: { some: { userId, leftAt: null } } },
                        ],
                    },
                });
                if (!ws)
                    throw Validation(`Task ${taskId} cannot be completed yet`);
            }
        }
        await this.prisma.workspaceAcademyTaskProgress.upsert({
            where: { userId_taskId: { userId, taskId } },
            create: { userId, taskId, status: "COMPLETED", completedAt: new Date() },
            update: { status: "COMPLETED", completedAt: new Date() },
        });
    }
    async reset(userId) {
        await this.prisma.$transaction([
            this.prisma.workspaceAcademyGuideProgress.deleteMany({ where: { userId } }),
            this.prisma.workspaceAcademyTaskProgress.deleteMany({ where: { userId } }),
            this.prisma.workspaceAcademyArticleView.deleteMany({ where: { userId } }),
            this.prisma.workspaceAcademyProfile.deleteMany({ where: { userId } }),
        ]);
    }
}
//# sourceMappingURL=workspace-academy.service.js.map