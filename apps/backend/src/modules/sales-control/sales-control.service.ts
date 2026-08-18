import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient, Role, User } from "@prisma/client";
import {
  canCreateSupplierCustomerAccount,
  type CreateCustomerAccountInput,
  type CustomerAccountDetailDto,
  type CustomerAccountDto,
  type UpdateCustomerAccountInput,
} from "@dmx/contracts/sales-control";
import { AppError } from "../../utils/httpErrors.js";
import { deleteStoredFile, writeStoredFile } from "../../lib/file-storage.js";
import { normalizePhoneInput, PENDING_PHONE_VERIFICATION } from "../phone-verification/phone-verification.policy.js";
import { notifyAdminsPhoneSubmitted } from "../phone-verification/phone-verification.service.js";

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

function isCustomerUser(user: Pick<User, "role" | "email">) {
  return ["BUYER", "SUPPLIER"].includes(user.role) && !user.email.endsWith("@demaxtore.com");
}

async function deleteWorkspaceTree(tx: Prisma.TransactionClient, workspaceId: string) {
  const children = await tx.workspace.findMany({
    where: { spawnedFromId: workspaceId },
    select: { id: true },
  });
  for (const child of children) {
    await deleteWorkspaceTree(tx, child.id);
  }
  await tx.workspace.delete({ where: { id: workspaceId } });
}

type OrgForDto = {
  name: string;
  interestAreas?: string[];
  logoStorageKey?: string | null;
  catalogStorageKey?: string | null;
  catalogExternalUrl?: string | null;
};

/**
 * Files are streamed through the API rather than exposed as storage paths, so the
 * DTO carries the serving endpoint instead of a URL the client could fetch directly.
 */
function toDto(user: User & { organisation: OrgForDto | null }): CustomerAccountDto {
  const org = user.organisation;
  const orgId = user.organisationId;
  return {
    id: user.id,
    organisationId: orgId ?? null,
    email: user.email,
    displayName: user.displayName,
    role: user.role as CustomerAccountDto["role"],
    organisation: org?.name ?? "—",
    interestAreas: org?.interestAreas ?? [],
    whatsappPhone: user.whatsappPhone ?? null,
    phoneNumber: user.phoneNumber ?? null,
    phoneVerificationStatus: user.phoneVerificationStatus ?? null,
    logoUrl: org?.logoStorageKey && orgId ? `/api/supplier-organisations/${orgId}/logo` : null,
    catalogUrl: org?.catalogExternalUrl
      ? org.catalogExternalUrl
      : org?.catalogStorageKey && orgId
        ? `/api/supplier-organisations/${orgId}/catalog`
        : null,
    catalogIsExternal: Boolean(org?.catalogExternalUrl),
    createdAt: user.createdAt.toISOString(),
  };
}

const ORG_DTO_SELECT = {
  name: true,
  interestAreas: true,
  logoStorageKey: true,
  catalogStorageKey: true,
  catalogExternalUrl: true,
} as const;

export class SalesControlService {
  constructor(private readonly prisma: PrismaClient) {}

  async listRecent(
    actorId: string,
    query?: string,
    limit = 50,
    filters?: { role?: "BUYER" | "SUPPLIER"; category?: string },
  ): Promise<CustomerAccountDto[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        role: filters?.role ? filters.role : { in: ["BUYER", "SUPPLIER"] },
        NOT: { email: { endsWith: "@demaxtore.com" } },
        ...(filters?.category
          ? { organisation: { interestAreas: { has: filters.category } } }
          : {}),
        ...(query?.trim()
          ? {
              OR: [
                { email: { contains: query.trim(), mode: "insensitive" as const } },
                { displayName: { contains: query.trim(), mode: "insensitive" as const } },
                { organisation: { name: { contains: query.trim(), mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      include: {
        organisation: { select: ORG_DTO_SELECT },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    void actorId;
    return rows.map((u) => toDto(u));
  }

  /** Distinct free-text interest labels, for the dashboard's category filter. */
  async listInterestCategories(): Promise<string[]> {
    const orgs = await this.prisma.organisation.findMany({
      where: { interestAreas: { isEmpty: false } },
      select: { interestAreas: true },
    });
    const labels = new Set<string>();
    for (const o of orgs) {
      for (const label of o.interestAreas) {
        if (label.trim()) labels.add(label.trim());
      }
    }
    return [...labels].sort((a, b) => a.localeCompare(b));
  }

  private async loadCustomer(customerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
      include: { organisation: { select: ORG_DTO_SELECT } },
    });
    if (!user || !isCustomerUser(user)) throw new AppError(404, "CUSTOMER_NOT_FOUND");
    return user;
  }

  async getCustomer(customerId: string): Promise<CustomerAccountDetailDto> {
    const user = await this.loadCustomer(customerId);
    const teammates = user.organisationId
      ? await this.prisma.user.findMany({
          where: {
            organisationId: user.organisationId,
            id: { not: user.id },
            role: { in: ["BUYER", "SUPPLIER"] },
          },
          include: { organisation: { select: ORG_DTO_SELECT } },
          orderBy: { createdAt: "asc" },
        })
      : [];
    return { ...toDto(user), teammates: teammates.map((t) => toDto(t)) };
  }

  async updateCustomer(
    customerId: string,
    input: UpdateCustomerAccountInput,
  ): Promise<CustomerAccountDetailDto> {
    const user = await this.loadCustomer(customerId);

    const email = input.email.trim().toLowerCase();
    if (email !== user.email) {
      const clash = await this.prisma.user.findUnique({ where: { email } });
      if (clash) throw new AppError(409, "EMAIL_ALREADY_EXISTS");
    }

    // The org name lives on the organisation, so renaming here renames it for teammates too.
    if (user.organisationId && input.organisationName.trim() !== user.organisation?.name) {
      await this.prisma.organisation.update({
        where: { id: user.organisationId },
        data: { name: input.organisationName.trim() },
      });
    }

    const phone = input.whatsappPhone ? normalizePhoneInput(input.whatsappPhone) : null;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: input.displayName.trim(),
        email,
        whatsappPhone: phone,
      },
    });

    return this.getCustomer(customerId);
  }

  private async orgIdOf(customerId: string): Promise<string> {
    const user = await this.loadCustomer(customerId);
    if (!user.organisationId) throw new AppError(400, "ORGANISATION_REQUIRED");
    return user.organisationId;
  }

  async setLogo(customerId: string, file: { buffer: Buffer; mimetype: string; originalname: string }) {
    if (!IMAGE_MIMES.has(file.mimetype)) throw new AppError(400, "INVALID_IMAGE_TYPE");
    const organisationId = await this.orgIdOf(customerId);
    const existing = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { logoStorageKey: true },
    });
    const { storageKey } = await writeStoredFile(file.buffer, file.originalname);
    await this.prisma.organisation.update({
      where: { id: organisationId },
      data: { logoStorageKey: storageKey, logoMimeType: file.mimetype },
    });
    if (existing?.logoStorageKey) await deleteStoredFile(existing.logoStorageKey);
    return { logoUrl: `/api/supplier-organisations/${organisationId}/logo` };
  }

  async setCatalog(
    customerId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    if (file.mimetype !== "application/pdf") throw new AppError(400, "INVALID_CATALOG_TYPE");
    const organisationId = await this.orgIdOf(customerId);
    const existing = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { catalogStorageKey: true },
    });
    const { storageKey } = await writeStoredFile(file.buffer, file.originalname);
    await this.prisma.organisation.update({
      where: { id: organisationId },
      // An uploaded PDF supersedes any external link, so clear it.
      data: {
        catalogStorageKey: storageKey,
        catalogMimeType: file.mimetype,
        catalogExternalUrl: null,
      },
    });
    if (existing?.catalogStorageKey) await deleteStoredFile(existing.catalogStorageKey);
    return {
      catalogUrl: `/api/supplier-organisations/${organisationId}/catalog`,
      catalogIsExternal: false,
    };
  }

  async setCatalogLink(customerId: string, url: string | null) {
    const organisationId = await this.orgIdOf(customerId);
    const existing = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { catalogStorageKey: true },
    });
    await this.prisma.organisation.update({
      where: { id: organisationId },
      data: url
        ? { catalogExternalUrl: url, catalogStorageKey: null, catalogMimeType: null }
        : { catalogExternalUrl: null },
    });
    if (url && existing?.catalogStorageKey) await deleteStoredFile(existing.catalogStorageKey);
    return { catalogUrl: url, catalogIsExternal: Boolean(url) };
  }

  async createCustomer(
    actor: { id: string; displayName: string; email: string; role: Role },
    input: CreateCustomerAccountInput,
    loginUrl: string,
  ) {
    if (input.role === "SUPPLIER" && !canCreateSupplierCustomerAccount(actor)) {
      throw new AppError(403, "FORBIDDEN", { message: "You are not allowed to create supplier accounts." });
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, "EMAIL_ALREADY_REGISTERED");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const orgKind = input.role === "BUYER" ? "BUYER_ORG" : "SUPPLIER_ORG";
    // A verification request is opened for every new customer, so a number is required
    // here even though the shared contract marks the field optional.
    if (!input.whatsappPhone) {
      throw new AppError(400, "WHATSAPP_PHONE_REQUIRED");
    }
    const phone = normalizePhoneInput(input.whatsappPhone);

    const user = await this.prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name: input.organisationName.trim(),
          kind: orgKind,
        },
      });

      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: input.displayName.trim(),
          role: input.role as Role,
          organisationId: organisation.id,
          whatsappPhone: phone,
          phoneNumber: phone,
          phoneVerificationStatus: PENDING_PHONE_VERIFICATION,
        },
        include: { organisation: { select: { name: true } } },
      });

      await tx.phoneVerificationRequest.create({
        data: { userId: created.id, phone, status: "PENDING" },
      });

      return created;
    });

    const req = await this.prisma.phoneVerificationRequest.findFirstOrThrow({
      where: { userId: user.id },
      orderBy: { submittedAt: "desc" },
    });
    void notifyAdminsPhoneSubmitted(
      this.prisma,
      req.id,
      { id: user.id, email: user.email, role: user.role },
      phone,
    ).catch(() => undefined);

    await this.sendAccountWelcomeNotifications({
      displayName: input.displayName.trim(),
      organisationName: input.organisationName.trim(),
      email,
      password: input.password,
      loginUrl,
      createdByName: actor.displayName,
      whatsappPhone: input.whatsappPhone,
      secondaryContactName: input.secondaryContactName,
      secondaryContactEmail: input.secondaryContactEmail,
      secondaryContactWhatsapp: input.secondaryContactWhatsapp,
    });

    return {
      account: toDto(user),
      loginUrl,
    };
  }

  private async sendAccountWelcomeNotifications(args: {
    displayName: string;
    organisationName: string;
    email: string;
    password: string;
    loginUrl: string;
    createdByName: string;
    whatsappPhone?: string;
    secondaryContactName?: string;
    secondaryContactEmail?: string;
    secondaryContactWhatsapp?: string;
  }) {
    const { mailer } = await import("../messaging/mailer.js");
    const { supplierAccountWelcomeTemplate, supplierAccountWelcomeWhatsApp } = await import("../messaging/templates.js");
    const { sendTextMessage } = await import("../chat/whatsapp.service.js");

    const welcomeArgs = {
      displayName: args.displayName,
      organisationName: args.organisationName,
      email: args.email,
      password: args.password,
      loginUrl: args.loginUrl,
      createdByName: args.createdByName,
    };

    const tpl = supplierAccountWelcomeTemplate(welcomeArgs);
    mailer.sendAsync({ to: args.email, ...tpl });

    if (args.secondaryContactEmail) {
      const secondaryTpl = supplierAccountWelcomeTemplate({
        ...welcomeArgs,
        displayName: args.secondaryContactName || args.secondaryContactEmail,
      });
      mailer.sendAsync({ to: args.secondaryContactEmail, ...secondaryTpl });
    }

    const waText = supplierAccountWelcomeWhatsApp(welcomeArgs);
    if (args.whatsappPhone) {
      void sendTextMessage(args.whatsappPhone, waText);
    }
    if (args.secondaryContactWhatsapp) {
      void sendTextMessage(args.secondaryContactWhatsapp, waText);
    }
  }

  async resetCustomerPassword(customerId: string, newPassword?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: customerId } });
    if (!user || !isCustomerUser(user)) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND");
    }

    const password = newPassword?.trim() || `DmX-${Math.random().toString(36).slice(2, 8)}!9`;
    if (password.length < 8) {
      throw new AppError(400, "PASSWORD_TOO_SHORT");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: customerId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: customerId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { email: user.email, passwordReset: true as const };
  }

  async deleteCustomer(customerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: customerId } });
    if (!user || !isCustomerUser(user)) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND");
    }

    const ownedWorkspaces = await this.prisma.workspace.findMany({
      where: { createdById: customerId },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const ws of ownedWorkspaces) {
        await deleteWorkspaceTree(tx, ws.id);
      }

      await tx.accountOwnership.updateMany({
        where: {
          OR: [{ salesUserId: customerId }, { operationsUserId: customerId }],
        },
        data: {
          salesUserId: null,
          operationsUserId: null,
        },
      });

      const organisationId = user.organisationId;
      await tx.user.delete({ where: { id: customerId } });

      if (organisationId) {
        const remaining = await tx.user.count({ where: { organisationId } });
        if (remaining === 0) {
          await tx.organisation.delete({ where: { id: organisationId } });
        }
      }
    });

    return { email: user.email, deleted: true as const };
  }
}
