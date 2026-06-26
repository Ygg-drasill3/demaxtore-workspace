import type { PrismaClient } from "@prisma/client";
import type { FreightShipper, FreightShipperDirectory } from "@dmx/contracts/freight-shippers";
import { CreateFreightShipperPayload } from "@dmx/contracts/freight-shippers.zod";
import { AppError } from "../../utils/httpErrors.js";

export class ShipperDirectoryService {
  constructor(private readonly db: PrismaClient) {}

  async list(search?: string): Promise<FreightShipperDirectory> {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { scacCode: { contains: search, mode: "insensitive" as const } },
            { country: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.db.freightShipper.findMany({
        where,
        orderBy: { name: "asc" },
        take: 200,
      }),
      this.db.freightShipper.count({ where }),
    ]);
    return { items: items.map(mapShipper), total };
  }

  async create(input: CreateFreightShipperPayload): Promise<FreightShipper> {
    const existing = await this.db.freightShipper.findFirst({
      where: { name: { equals: input.name.trim(), mode: "insensitive" } },
    });
    if (existing) throw new AppError(409, "SHIPPER_ALREADY_EXISTS");

    const row = await this.db.freightShipper.create({
      data: {
        name: input.name.trim(),
        scacCode: input.scacCode?.trim() || null,
        country: input.country?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
    return mapShipper(row);
  }

  async remove(id: string): Promise<void> {
    const row = await this.db.freightShipper.findUnique({ where: { id } });
    if (!row) throw new AppError(404, "SHIPPER_NOT_FOUND");
    await this.db.freightShipper.delete({ where: { id } });
  }
}

function mapShipper(r: {
  id: string;
  name: string;
  scacCode: string | null;
  country: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
}): FreightShipper {
  return {
    id: r.id,
    name: r.name,
    scacCode: r.scacCode,
    country: r.country,
    notes: r.notes,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}
