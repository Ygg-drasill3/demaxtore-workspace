import { z } from "zod";
import { OnboardingRole } from "./onboarding.js";
export const CompleteTourSchema = z.object({
    tourId: z.string().optional(),
});
export const OpenLearningSchema = z.object({
    contentId: z.string().min(1),
});
export const OnboardingProgressSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(OnboardingRole),
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "STALLED"]),
    completedSteps: z.array(z.string()),
    currentStep: z.string().nullable(),
    completed: z.boolean(),
    firstTradeCompleted: z.boolean(),
    completionPercent: z.number().int().min(0).max(100),
    tourCompleted: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
