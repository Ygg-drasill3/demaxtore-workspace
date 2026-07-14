import { afterEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ReferenceFreightService } from "./reference-freight.service.js";
import { ErrorCodes } from "@dmx/contracts";
import { AppError } from "../../utils/httpErrors.js";

const prisma = new PrismaClient();
const svc = () => new ReferenceFreightService(prisma);
const testLane = () => `T${Date.now().toString(36).toUpperCase()}`;

describe("ReferenceFreightService", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length) {
      await prisma.referenceFreightRateAudit.deleteMany({ where: { rateId: { in: createdIds } } });
      await prisma.referenceFreightRate.deleteMany({ where: { id: { in: createdIds } } });
      createdIds.length = 0;
    }
  });

  it("rejects overlapping active rates for the same lane", async () => {
    const origin = testLane();
    const dest = testLane();
    const validFrom = "2026-09-01T00:00:00.000Z";
    const validUntil = "2026-09-30T23:59:59.999Z";

    const first = await svc().create("00000000-0000-0000-0000-000000000001", {
      originPort: origin,
      destinationPort: dest,
      containerType: "20GP",
      referenceFreight: 2500,
      currency: "USD",
      validFrom,
      validUntil,
    });
    createdIds.push(first.id);

    await expect(
      svc().create("00000000-0000-0000-0000-000000000001", {
        originPort: origin,
        destinationPort: dest,
        containerType: "20GP",
        referenceFreight: 2600,
        currency: "USD",
        validFrom: "2026-09-15T00:00:00.000Z",
        validUntil: "2026-10-15T23:59:59.999Z",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.REFERENCE_FREIGHT_OVERLAP });
  });

  it("excludes deactivated rates from active lookup", async () => {
    const origin = testLane();
    const dest = testLane();
    const at = new Date("2026-10-10T12:00:00.000Z");

    const row = await svc().create("00000000-0000-0000-0000-000000000001", {
      originPort: origin,
      destinationPort: dest,
      containerType: "40HC",
      referenceFreight: 3300,
      currency: "USD",
      validFrom: "2026-10-01T00:00:00.000Z",
      validUntil: "2026-10-31T23:59:59.999Z",
    });
    createdIds.push(row.id);

    await svc().deactivate("00000000-0000-0000-0000-000000000001", row.id);
    const found = await svc().lookupActiveRate(origin, dest, "40HC", at);
    expect(found).toBeNull();
  });

  it("writes audit entries on create and deactivate", async () => {
    const origin = testLane();
    const dest = testLane();
    const row = await svc().create("00000000-0000-0000-0000-000000000001", {
      originPort: origin,
      destinationPort: dest,
      containerType: "20GP",
      referenceFreight: 2100,
      currency: "USD",
      validFrom: "2026-11-01T00:00:00.000Z",
      validUntil: "2026-11-30T23:59:59.999Z",
    });
    createdIds.push(row.id);

    await svc().deactivate("00000000-0000-0000-0000-000000000001", row.id);
    const audits = await svc().listAudits(row.id);
    expect(audits.some((a) => a.action === "CREATED")).toBe(true);
    expect(audits.some((a) => a.action === "DEACTIVATED")).toBe(true);
  });

  it("does not allow editing inactive rates", async () => {
    const origin = testLane();
    const dest = testLane();
    const row = await svc().create("00000000-0000-0000-0000-000000000001", {
      originPort: origin,
      destinationPort: dest,
      containerType: "20GP",
      referenceFreight: 2100,
      currency: "USD",
      validFrom: "2026-12-01T00:00:00.000Z",
      validUntil: "2026-12-31T23:59:59.999Z",
    });
    createdIds.push(row.id);
    await svc().deactivate("00000000-0000-0000-0000-000000000001", row.id);

    await expect(
      svc().update("00000000-0000-0000-0000-000000000001", row.id, { referenceFreight: 2200 }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
