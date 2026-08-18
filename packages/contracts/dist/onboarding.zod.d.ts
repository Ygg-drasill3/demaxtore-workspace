import { z } from "zod";
export declare const CompleteTourSchema: z.ZodObject<{
    tourId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tourId?: string | undefined;
}, {
    tourId?: string | undefined;
}>;
export declare const OpenLearningSchema: z.ZodObject<{
    contentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    contentId: string;
}, {
    contentId: string;
}>;
export declare const OnboardingProgressSchema: z.ZodObject<{
    userId: z.ZodString;
    role: z.ZodEnum<["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL"]>;
    status: z.ZodEnum<["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "STALLED"]>;
    completedSteps: z.ZodArray<z.ZodString, "many">;
    currentStep: z.ZodNullable<z.ZodString>;
    completed: z.ZodBoolean;
    firstTradeCompleted: z.ZodBoolean;
    completionPercent: z.ZodNumber;
    tourCompleted: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "STALLED";
    role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL";
    createdAt: string;
    updatedAt: string;
    completed: boolean;
    completionPercent: number;
    userId: string;
    completedSteps: string[];
    currentStep: string | null;
    firstTradeCompleted: boolean;
    tourCompleted: boolean;
}, {
    status: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "STALLED";
    role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL";
    createdAt: string;
    updatedAt: string;
    completed: boolean;
    completionPercent: number;
    userId: string;
    completedSteps: string[];
    currentStep: string | null;
    firstTradeCompleted: boolean;
    tourCompleted: boolean;
}>;
