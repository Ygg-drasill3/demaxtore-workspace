import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import type {
  CatalogCategoryInterestOption,
  OrganisationCategoryInterestDto,
  SupplierOrganisationInterestSummary,
} from "@dmx/contracts/supplier-interest";
import {
  normalizeInterestLabels,
  resolveInterestCategorySlugs,
  SUPPLIER_INTEREST_CATEGORY_SLUGS,
} from "@dmx/contracts/supplier-interest";
import type { Prisma } from "@prisma/client";

function mapCategory(c: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}): CatalogCategoryInterestOption {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
  };
}

async function resolveActorOrganisationId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organisationId: true, role: true },
  });
  if (!user) throw new AppError(401, "UNAUTHORIZED");
  if (user.role !== "SUPPLIER") throw new AppError(403, "SUPPLIER_ONLY");
  if (!user.organisationId) throw new AppError(400, "ORGANISATION_REQUIRED");
  return user.organisationId;
}

export const supplierInterestService = {
  async listInterestCategoryOptions(): Promise<CatalogCategoryInterestOption[]> {
    const rows = await prisma.catalogCategory.findMany({
      where: {
        status: "ACTIVE",
        slug: { in: [...SUPPLIER_INTEREST_CATEGORY_SLUGS] },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        sortOrder: true,
      },
    });
    return rows.map(mapCategory);
  },

  async listSupplierOrganisations(query: {
    q?: string;
    limit?: number;
  }): Promise<SupplierOrganisationInterestSummary[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const where: Prisma.OrganisationWhereInput = {
      OR: [
        { kind: "SUPPLIER_ORG" },
        { users: { some: { role: "SUPPLIER" } } },
      ],
    };
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
            {
              users: {
                some: {
                  role: "SUPPLIER",
                  OR: [
                    { displayName: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        },
      ];
    }

    const rows = await prisma.organisation.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      select: {
        id: true,
        name: true,
        location: true,
        kind: true,
        users: {
          where: { role: "SUPPLIER" },
          select: { id: true },
        },
        interestAreas: true,
      },
    });

    return rows.map((o) => {
      const labels = normalizeInterestLabels(o.interestAreas);
      return {
        organisationId: o.id,
        name: o.name,
        location: o.location,
        kind: o.kind,
        supplierUserCount: o.users.length,
        labels,
        categoryNames: labels,
        categoryIds: [],
        categorySlugs: [],
      };
    });
  },

  async getInterests(organisationId: string): Promise<OrganisationCategoryInterestDto> {
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { interestAreas: true },
    });
    if (!org) throw new AppError(404, "ORGANISATION_NOT_FOUND");
    return {
      organisationId,
      labels: normalizeInterestLabels(org.interestAreas),
      categoryIds: [],
      categories: [],
    };
  },

  async getMyInterests(userId: string): Promise<OrganisationCategoryInterestDto> {
    const organisationId = await resolveActorOrganisationId(userId);
    return this.getInterests(organisationId);
  },

  async setInterests(
    organisationId: string,
    labels: string[],
  ): Promise<OrganisationCategoryInterestDto> {
    const normalized = normalizeInterestLabels(labels);
    const exists = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { id: true },
    });
    if (!exists) throw new AppError(404, "ORGANISATION_NOT_FOUND");

    await prisma.organisation.update({
      where: { id: organisationId },
      data: { interestAreas: normalized },
    });

    return this.getInterests(organisationId);
  },

  async setMyInterests(
    userId: string,
    labels: string[],
  ): Promise<OrganisationCategoryInterestDto> {
    const organisationId = await resolveActorOrganisationId(userId);
    return this.setInterests(organisationId, labels);
  },

  /**
   * Resolve free-text RFQ category / line text to active CatalogCategory slugs.
   */
  async resolveSlugsFromText(text: string | null | undefined): Promise<string[]> {
    return resolveInterestCategorySlugs(text, SUPPLIER_INTEREST_CATEGORY_SLUGS);
  },
};
