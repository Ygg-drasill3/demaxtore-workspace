import { z } from "zod";
export declare const SetOrganisationCategoryInterestsSchema: z.ZodEffects<z.ZodObject<{
    /** Free-text interest labels (preferred). */
    labels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** @deprecated Ignored — fixed catalog categories removed from Interest Areas. */
    categoryIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    labels?: string[] | undefined;
    categoryIds?: string[] | undefined;
}, {
    labels?: string[] | undefined;
    categoryIds?: string[] | undefined;
}>, {
    labels?: string[] | undefined;
    categoryIds?: string[] | undefined;
}, {
    labels?: string[] | undefined;
    categoryIds?: string[] | undefined;
}>;
export type SetOrganisationCategoryInterestsInput = z.infer<typeof SetOrganisationCategoryInterestsSchema>;
