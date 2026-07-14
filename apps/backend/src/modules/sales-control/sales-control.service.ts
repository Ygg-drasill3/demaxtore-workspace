import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient, Role, User } from "@prisma/client";
import {
  canCreateSupplierCustomerAccount,
  type CreateCustomerAccountInput,
  type CustomerAccountDto,
} from "@dmx/contracts/sales-control";
import { AppError } from "../../utils/httpErrors.js";

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

function toDto(
  user: User & { organisation: { name: string } | null },
): CustomerAccountDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as CustomerAccountDto["role"],
    organisation: user.organisation?.name ?? "—",
    createdAt: user.createdAt.toISOString(),
  };
}

export class SalesControlService {
  constructor(private readonly prisma: PrismaClient) {}

  async listRecent(actorId: string, query?: string, limit = 50): Promise<CustomerAccountDto[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        role: { in: ["BUYER", "SUPPLIER"] },
        NOT: { email: { endsWith: "@demaxtore.com" } },
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
        organisation: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    void actorId;
    return rows.map((u) => toDto(u));
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

    const user = await this.prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name: input.organisationName.trim(),
          kind: orgKind,
        },
      });

      return tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: input.displayName.trim(),
          role: input.role as Role,
          organisationId: organisation.id,
          whatsappPhone: input.whatsappPhone?.trim() || null,
        },
        include: { organisation: { select: { name: true } } },
      });
    });

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
