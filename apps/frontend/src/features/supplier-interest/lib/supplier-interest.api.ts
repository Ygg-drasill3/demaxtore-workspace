import { api } from "@/lib/api";
import type {
  CatalogCategoryInterestOption,
  OrganisationCategoryInterestDto,
  SupplierOrganisationInterestSummary,
} from "@dmx/contracts/supplier-interest";

export const supplierInterestApi = {
  listCategories: () =>
    api
      .get<{ items: CatalogCategoryInterestOption[] }>("/supplier-interests/categories")
      .then((r) => r.data.items),

  getMine: () =>
    api.get<OrganisationCategoryInterestDto>("/supplier-interests/me").then((r) => r.data),

  setMine: (categoryIds: string[]) =>
    api
      .put<OrganisationCategoryInterestDto>("/supplier-interests/me", { categoryIds })
      .then((r) => r.data),

  listOrganisations: (q?: string, limit = 100) =>
    api
      .get<{ items: SupplierOrganisationInterestSummary[] }>("/supplier-interests/organisations", {
        params: { q: q || undefined, limit },
      })
      .then((r) => r.data.items),

  getForOrganisation: (orgId: string) =>
    api
      .get<OrganisationCategoryInterestDto>(`/supplier-interests/organisations/${orgId}`)
      .then((r) => r.data),

  setForOrganisation: (orgId: string, categoryIds: string[]) =>
    api
      .put<OrganisationCategoryInterestDto>(`/supplier-interests/organisations/${orgId}`, {
        categoryIds,
      })
      .then((r) => r.data),
};
