import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ReferenceFreightCopyMonthResultDto,
  ReferenceFreightImportResultDto,
  ReferenceFreightRateAuditDto,
  ReferenceFreightRateDto,
  ReferenceFreightRateListPage,
} from "@dmx/contracts/reference-freight";
import {
  computeReferenceFreightLifecycleStatus,
  REFERENCE_FREIGHT_MISSING_MESSAGE_TR,
} from "@dmx/contracts/reference-freight";
import type {
  CopyReferenceFreightMonthPayload,
  CreateReferenceFreightRatePayload,
  ListReferenceFreightRatesQuery,
  UpdateReferenceFreightRatePayload,
} from "@dmx/contracts/reference-freight.zod";
import { ErrorCodes } from "@dmx/contracts";
import { AppError } from "../../utils/httpErrors.js";
import { logReferenceFreightAudit } from "./reference-freight-audit.js";
import { normalizeContainerType, normalizePortCode } from "./port-normalize.js";

type Db = PrismaClient | Prisma.TransactionClient;

type RateRow = {
  id: string;
  originPort: string;
  destinationPort: string;
  containerType: string;
  referenceFreight: Prisma.Decimal;
  currency: string;
  validFrom: Date;
  validUntil: Date;
  status: string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function snapshotOf(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function toDto(row: RateRow, now = new Date()): ReferenceFreightRateDto {
  const status = row.status as ReferenceFreightRateDto["status"];
  return {
    id: row.id,
    originPort: row.originPort,
    destinationPort: row.destinationPort,
    containerType: row.containerType,
    referenceFreight: Number(row.referenceFreight),
    currency: row.currency,
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil.toISOString(),
    status,
    lifecycleStatus: computeReferenceFreightLifecycleStatus(status, row.validFrom, row.validUntil, now),
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function auditDto(row: {
  id: string;
  rateId: string | null;
  action: string;
  actorUserId: string | null;
  snapshot: Prisma.JsonValue;
  createdAt: Date;
}): ReferenceFreightRateAuditDto {
  return {
    id: row.id,
    rateId: row.rateId,
    action: row.action as ReferenceFreightRateAuditDto["action"],
    actorUserId: row.actorUserId,
    snapshot: (row.snapshot ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

function monthBounds(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const validFrom = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const validUntil = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { validFrom, validUntil };
}

function currentYearMonth(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousYearMonth(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function assertValidRange(validFrom: Date, validUntil: Date) {
  if (validUntil <= validFrom) {
    throw new AppError(400, "INVALID_VALIDITY_RANGE");
  }
}

function isOverlapError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23P01"
  );
}

export class ReferenceFreightService {
  constructor(private readonly db: Db) {}

  async listPaginated(query: ListReferenceFreightRatesQuery): Promise<ReferenceFreightRateListPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? query.limit ?? 25;
    const now = new Date();
    const where = this.buildListWhere(query, now);

    const [rows, total] = await Promise.all([
      this.db.referenceFreightRate.findMany({
        where,
        orderBy: [{ validFrom: "desc" }, { originPort: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.referenceFreightRate.count({ where }),
    ]);

    let items = rows.map((r) => toDto(r, now));
    if (query.lifecycle) {
      items = items.filter((i) => i.lifecycleStatus === query.lifecycle);
    }

    return { items, total, page, pageSize };
  }

  /** @deprecated Use listPaginated */
  async list(query: ListReferenceFreightRatesQuery): Promise<ReferenceFreightRateDto[]> {
    const page = await this.listPaginated({ ...query, page: 1, pageSize: query.limit ?? 100 });
    return page.items;
  }

  async getById(id: string): Promise<ReferenceFreightRateDto> {
    const row = await this.db.referenceFreightRate.findUnique({ where: { id } });
    if (!row) throw new AppError(404, "NOT_FOUND");
    return toDto(row);
  }

  async create(actorId: string, payload: CreateReferenceFreightRatePayload): Promise<ReferenceFreightRateDto> {
    const normalized = this.normalizePayload(payload);
    assertValidRange(normalized.validFrom, normalized.validUntil);
    await this.assertNoOverlap(normalized);

    try {
      const row = await this.db.referenceFreightRate.create({
        data: { ...normalized, status: "ACTIVE", createdById: actorId },
      });
      await logReferenceFreightAudit(this.db, {
        rateId: row.id,
        action: "CREATED",
        actorUserId: actorId,
        snapshot: snapshotOf(toDto(row)),
      });
      return toDto(row);
    } catch (err) {
      if (isOverlapError(err)) {
        throw new AppError(409, ErrorCodes.REFERENCE_FREIGHT_OVERLAP, {
          message: "An active reference rate already exists for this lane and validity period.",
        });
      }
      throw err;
    }
  }

  async upsert(actorId: string, payload: CreateReferenceFreightRatePayload): Promise<ReferenceFreightRateDto> {
    return this.create(actorId, payload);
  }

  async update(
    actorId: string,
    id: string,
    payload: UpdateReferenceFreightRatePayload,
  ): Promise<ReferenceFreightRateDto> {
    const existing = await this.db.referenceFreightRate.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND");
    if (existing.status === "INACTIVE") {
      throw new AppError(409, "CONFLICT", { message: "Inactive rates cannot be edited. Create a new rate instead." });
    }

    const merged = {
      originPort: payload.originPort ?? existing.originPort,
      destinationPort: payload.destinationPort ?? existing.destinationPort,
      containerType: payload.containerType ?? existing.containerType,
      referenceFreight: payload.referenceFreight ?? Number(existing.referenceFreight),
      currency: payload.currency ?? existing.currency,
      validFrom: payload.validFrom ? new Date(payload.validFrom) : existing.validFrom,
      validUntil: payload.validUntil ? new Date(payload.validUntil) : existing.validUntil,
    };
    const normalized = this.normalizePayload(merged);
    assertValidRange(normalized.validFrom, normalized.validUntil);
    await this.assertNoOverlap(normalized, id);

    const before = toDto(existing);
    try {
      const row = await this.db.referenceFreightRate.update({
        where: { id },
        data: normalized,
      });
      await logReferenceFreightAudit(this.db, {
        rateId: row.id,
        action: "UPDATED",
        actorUserId: actorId,
        snapshot: snapshotOf({ before, after: toDto(row) }),
      });
      return toDto(row);
    } catch (err) {
      if (isOverlapError(err)) {
        throw new AppError(409, ErrorCodes.REFERENCE_FREIGHT_OVERLAP, {
          message: "Update would overlap another active reference rate for this lane.",
        });
      }
      throw err;
    }
  }

  async deactivate(actorId: string, id: string): Promise<ReferenceFreightRateDto> {
    const existing = await this.db.referenceFreightRate.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND");
    if (existing.status === "INACTIVE") return toDto(existing);

    const row = await this.db.referenceFreightRate.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    await logReferenceFreightAudit(this.db, {
      rateId: row.id,
      action: "DEACTIVATED",
      actorUserId: actorId,
      snapshot: snapshotOf({ before: toDto(existing), after: toDto(row) }),
    });
    return toDto(row);
  }

  async listAudits(rateId: string, limit = 50): Promise<ReferenceFreightRateAuditDto[]> {
    const rows = await this.db.referenceFreightRateAudit.findMany({
      where: { rateId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(auditDto);
  }

  async copyPreviousMonth(
    actorId: string,
    payload: CopyReferenceFreightMonthPayload,
  ): Promise<ReferenceFreightCopyMonthResultDto> {
    const targetMonth = payload.targetMonth ?? currentYearMonth();
    const sourceMonth = previousYearMonth(targetMonth);
    const sourceBounds = monthBounds(sourceMonth);
    const targetBounds = monthBounds(targetMonth);

    const sourceRates = await this.db.referenceFreightRate.findMany({
      where: {
        status: "ACTIVE",
        validFrom: { lte: sourceBounds.validUntil },
        validUntil: { gte: sourceBounds.validFrom },
      },
      orderBy: { validFrom: "desc" },
    });

    let copied = 0;
    let skipped = 0;

    for (const src of sourceRates) {
      try {
        await this.create(actorId, {
          originPort: src.originPort,
          destinationPort: src.destinationPort,
          containerType: src.containerType,
          referenceFreight: Number(src.referenceFreight),
          currency: src.currency,
          validFrom: targetBounds.validFrom.toISOString(),
          validUntil: targetBounds.validUntil.toISOString(),
        });
        copied++;
        await logReferenceFreightAudit(this.db, {
          rateId: src.id,
          action: "COPIED_MONTH",
          actorUserId: actorId,
          snapshot: snapshotOf({ sourceMonth, targetMonth, sourceRateId: src.id }),
        });
      } catch (err) {
        if (err instanceof AppError && err.code === ErrorCodes.REFERENCE_FREIGHT_OVERLAP) {
          skipped++;
          continue;
        }
        throw err;
      }
    }

    return { copied, skipped, targetMonth };
  }

  async importCsv(actorId: string, csv: string): Promise<ReferenceFreightImportResultDto> {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", { message: "CSV is empty" });
    }

    const header = lines[0].toLowerCase();
    const hasHeader =
      header.includes("origin") && header.includes("destination") && header.includes("container");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    let created = 0;
    let skipped = 0;
    const errors: ReferenceFreightImportResultDto["errors"] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = hasHeader ? i + 2 : i + 1;
      const cols = dataLines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 4) {
        errors.push({ row: rowNum, message: "Expected at least origin, destination, container, freight" });
        skipped++;
        continue;
      }

      const [originPort, destinationPort, containerType, freightRaw, currency, validFromRaw, validUntilRaw] = cols;
      const referenceFreight = Number(freightRaw);
      if (!Number.isFinite(referenceFreight) || referenceFreight <= 0) {
        errors.push({ row: rowNum, message: "Invalid reference freight amount" });
        skipped++;
        continue;
      }

      const now = new Date();
      const defaultBounds = monthBounds(currentYearMonth(now));
      const validFrom = validFromRaw ? new Date(validFromRaw) : defaultBounds.validFrom;
      const validUntil = validUntilRaw ? new Date(validUntilRaw) : defaultBounds.validUntil;

      try {
        const row = await this.create(actorId, {
          originPort,
          destinationPort,
          containerType,
          referenceFreight,
          currency: (currency ?? "USD").toUpperCase(),
          validFrom: validFrom.toISOString(),
          validUntil: validUntil.toISOString(),
        });
        created++;
        await logReferenceFreightAudit(this.db, {
          rateId: row.id,
          action: "IMPORTED",
          actorUserId: actorId,
          snapshot: snapshotOf({ row: rowNum, rate: row }),
        });
      } catch (err) {
        const message =
          err instanceof AppError
            ? (typeof err.details?.message === "string" ? err.details.message : err.message)
            : "Import failed";
        errors.push({ row: rowNum, message });
        skipped++;
      }
    }

    return { created, skipped, errors };
  }

  async lookupActiveRate(
    originPort: string,
    destinationPort: string,
    containerType: string,
    at: Date = new Date(),
  ): Promise<ReferenceFreightRateDto | null> {
    const pol = normalizePortCode(originPort);
    const pod = normalizePortCode(destinationPort);
    const container = normalizeContainerType(containerType);

    const candidates = await this.db.referenceFreightRate.findMany({
      where: {
        status: "ACTIVE",
        originPort: pol,
        destinationPort: pod,
        containerType: container,
        validFrom: { lte: at },
        validUntil: { gte: at },
      },
      orderBy: { validFrom: "desc" },
      take: 1,
    });
    if (candidates[0]) return toDto(candidates[0], at);
    return null;
  }

  async requireActiveRate(
    originPort: string,
    destinationPort: string,
    containerType: string,
    at: Date = new Date(),
  ): Promise<ReferenceFreightRateDto> {
    const rate = await this.lookupActiveRate(originPort, destinationPort, containerType, at);
    if (!rate) {
      throw new AppError(409, ErrorCodes.REFERENCE_FREIGHT_NOT_FOUND, {
        message: REFERENCE_FREIGHT_MISSING_MESSAGE_TR,
        originPort: normalizePortCode(originPort),
        destinationPort: normalizePortCode(destinationPort),
        containerType: normalizeContainerType(containerType),
      });
    }
    return rate;
  }

  private normalizePayload(payload: {
    originPort: string;
    destinationPort: string;
    containerType: string;
    referenceFreight: number;
    currency?: string;
    validFrom: Date | string;
    validUntil: Date | string;
  }) {
    return {
      originPort: normalizePortCode(payload.originPort),
      destinationPort: normalizePortCode(payload.destinationPort),
      containerType: normalizeContainerType(payload.containerType),
      referenceFreight: payload.referenceFreight,
      currency: (payload.currency ?? "USD").toUpperCase(),
      validFrom: new Date(payload.validFrom),
      validUntil: new Date(payload.validUntil),
    };
  }

  private async assertNoOverlap(
    normalized: ReturnType<ReferenceFreightService["normalizePayload"]>,
    excludeId?: string,
  ) {
    const overlap = await this.db.referenceFreightRate.findFirst({
      where: {
        status: "ACTIVE",
        originPort: normalized.originPort,
        destinationPort: normalized.destinationPort,
        containerType: normalized.containerType,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        validFrom: { lte: normalized.validUntil },
        validUntil: { gte: normalized.validFrom },
      },
    });
    if (overlap) {
      throw new AppError(409, ErrorCodes.REFERENCE_FREIGHT_OVERLAP, {
        message: "An active reference rate already exists for this lane and validity period.",
        conflictingRateId: overlap.id,
      });
    }
  }

  private buildListWhere(query: ListReferenceFreightRatesQuery, now: Date): Prisma.ReferenceFreightRateWhereInput {
    const where: Prisma.ReferenceFreightRateWhereInput = {};
    if (query.originPort) where.originPort = normalizePortCode(query.originPort);
    if (query.destinationPort) where.destinationPort = normalizePortCode(query.destinationPort);
    if (query.containerType) where.containerType = normalizeContainerType(query.containerType);
    if (query.status) where.status = query.status;
    if (query.activeOnly) {
      where.status = "ACTIVE";
      where.validFrom = { lte: now };
      where.validUntil = { gte: now };
    }
    if (query.lifecycle === "INACTIVE") where.status = "INACTIVE";
    if (query.lifecycle === "EXPIRED") {
      where.validUntil = { lt: now };
    }
    if (query.lifecycle === "EXPIRING_SOON") {
      const soon = new Date(now.getTime() + 7 * 86_400_000);
      where.status = "ACTIVE";
      where.validFrom = { lte: now };
      where.validUntil = { gte: now, lte: soon };
    }
    if (query.lifecycle === "ACTIVE") {
      const soon = new Date(now.getTime() + 7 * 86_400_000);
      where.status = "ACTIVE";
      where.OR = [
        { validFrom: { gt: now } },
        { validUntil: { gt: soon } },
      ];
      where.validUntil = { gte: now };
    }
    return where;
  }
}

export async function lookupReferenceFreightInTx(
  db: Db,
  originPort: string,
  destinationPort: string,
  containerType: string,
  at: Date = new Date(),
) {
  return new ReferenceFreightService(db).lookupActiveRate(originPort, destinationPort, containerType, at);
}
