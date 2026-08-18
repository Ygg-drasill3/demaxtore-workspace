import { z } from "zod";

export const SetOrganisationCategoryInterestsSchema = z.object({
  /** Free-text interest labels (preferred). */
  labels: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  /** @deprecated Ignored — fixed catalog categories removed from Interest Areas. */
  categoryIds: z.array(z.string().uuid()).max(50).optional(),
}).refine(
  (v) => v.labels != null || v.categoryIds != null,
  { message: "labels is required" },
);
export type SetOrganisationCategoryInterestsInput = z.infer<
  typeof SetOrganisationCategoryInterestsSchema
>;
