import type { PrismaClient } from "@prisma/client";
import type { ForwarderContact, ForwarderDirectory } from "@dmx/contracts/freight-communications";
import {
  CreateForwarderPayload,
  UpdateForwarderPayload,
} from "@dmx/contracts/freight-communications.zod";
import { AppError } from "../../utils/httpErrors.js";

export class ForwarderDirectoryService {
  constructor(private readonly db: PrismaClient) {}

  async list(search?: string): Promise<ForwarderDirectory> {
    const where = search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" as const } },
            { contactName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.db.forwarderContact.findMany({
        where,
        orderBy: { companyName: "asc" },
        take: 100,
      }),
      this.db.forwarderContact.count({ where }),
    ]);
    return { items: items.map(mapForwarder), total };
  }

  async get(id: string): Promise<ForwarderContact> {
    const row = await this.db.forwarderContact.findUnique({ where: { id } });
    if (!row) throw new AppError(404, "FORWARDER_NOT_FOUND");
    return mapForwarder(row);
  }

  async create(input: CreateForwarderPayload): Promise<ForwarderContact> {
    const row = await this.db.forwarderContact.create({
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        country: input.country,
        notes: input.notes,
      },
    });
    return mapForwarder(row);
  }

  async update(id: string, input: UpdateForwarderPayload): Promise<ForwarderContact> {
    await this.get(id);
    const row = await this.db.forwarderContact.update({
      where: { id },
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        country: input.country,
        notes: input.notes,
        active: input.active,
      },
    });
    return mapForwarder(row);
  }

  async deactivate(id: string): Promise<ForwarderContact> {
    return this.update(id, { active: false });
  }
}

function mapForwarder(r: {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  country: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
}): ForwarderContact {
  return {
    id: r.id,
    companyName: r.companyName,
    contactName: r.contactName,
    email: r.email,
    phone: r.phone,
    country: r.country,
    notes: r.notes,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}
