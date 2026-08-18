import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { encryptSecret } from "../../lib/secret-crypto.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { isValidE2eSecretValue } from "../../middleware/e2e-bypass.js";

/** E2E-only: seed buyer WhatsApp connection without Meta OAuth. Never mount in production without secret. */
export const whatsappBusinessE2eRouter = Router();

const MockConnectSchema = z.object({
  buyerEmail: z.string().email(),
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  displayPhoneNumber: z.string().min(1),
  verifiedName: z.string().optional(),
  fakeAccessToken: z.string().min(8),
});

whatsappBusinessE2eRouter.post(
  "/whatsapp-business/mock-connect",
  asyncHandler(async (req, res) => {
    const secret = req.headers["x-e2e-test-secret"];
    const provided = typeof secret === "string" ? secret : "";
    if (!isValidE2eSecretValue(provided)) {
      return res.status(403).json({ error: { code: "FORBIDDEN" } });
    }

    const body = MockConnectSchema.parse(req.body);
    const buyer = await prisma.user.findUnique({ where: { email: body.buyerEmail }, select: { id: true, role: true } });
    if (!buyer || buyer.role !== "BUYER") {
      return res.status(404).json({ error: { code: "BUYER_NOT_FOUND" } });
    }

    const now = new Date();
    const row = await prisma.whatsAppBusinessConnection.upsert({
      where: { buyerId: buyer.id },
      create: {
        buyerId: buyer.id,
        metaBusinessId: "e2e-business",
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        displayPhoneNumber: body.displayPhoneNumber,
        verifiedName: body.verifiedName ?? "E2E Buyer",
        encryptedAccessToken: encryptSecret(body.fakeAccessToken),
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "CONNECTED",
        connectedAt: now,
        lastHealthCheckAt: now,
      },
      update: {
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        displayPhoneNumber: body.displayPhoneNumber,
        verifiedName: body.verifiedName ?? "E2E Buyer",
        encryptedAccessToken: encryptSecret(body.fakeAccessToken),
        status: "CONNECTED",
        connectedAt: now,
        disconnectedAt: null,
        lastHealthCheckAt: now,
      },
    });

    res.status(201).json({
      connection: {
        status: row.status,
        connected: true,
        displayPhoneNumber: row.displayPhoneNumber,
        phoneNumberId: row.phoneNumberId,
      },
    });
  }),
);

whatsappBusinessE2eRouter.post(
  "/whatsapp-business/mock-disconnect",
  asyncHandler(async (req, res) => {
    const secret = req.headers["x-e2e-test-secret"];
    const provided = typeof secret === "string" ? secret : "";
    if (!isValidE2eSecretValue(provided)) {
      return res.status(403).json({ error: { code: "FORBIDDEN" } });
    }

    const body = z.object({ buyerEmail: z.string().email() }).parse(req.body);
    const buyer = await prisma.user.findUnique({ where: { email: body.buyerEmail }, select: { id: true } });
    if (!buyer) return res.status(404).json({ error: { code: "BUYER_NOT_FOUND" } });

    await prisma.whatsAppBusinessConnection.updateMany({
      where: { buyerId: buyer.id },
      data: { status: "DISCONNECTED", disconnectedAt: new Date() },
    });

    res.json({ ok: true });
  }),
);

/**
 * Gated on NODE_ENV as well as the secret: these routes overwrite a real buyer's WhatsApp
 * credentials with a fake token, so possession of the shared secret must not be enough to
 * reach them on a production instance.
 */
export function shouldMountWhatsappE2eRoutes(): boolean {
  if (env.NODE_ENV === "production") return false;
  return Boolean(env.E2E_TEST_SECRET && env.E2E_TEST_SECRET.length >= 32);
}
