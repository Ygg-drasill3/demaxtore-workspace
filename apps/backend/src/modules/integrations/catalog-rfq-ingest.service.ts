import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
import { RfqService } from "../rfq/rfq.service.js";
import type { AuthUser } from "../rfq/rfq.policy.js";
import { CreateRfqDraftInput } from "@dmx/contracts/rfq.zod";
import {
  CatalogRfqFormFields,
  buildCatalogProductDescription,
  catalogIntakeFromIngestBody,
  type CatalogIntakeDTO,
} from "@dmx/contracts/catalog-rfq-intake";

export const CatalogRfqIngestBody = z
  .object({
    title: z.string().min(1).max(300).optional(),
    contact_email: z.string().email(),
    description: z.string().min(1).max(16000).optional(),
    category: z.string().max(500).optional(),
    currency: z.enum(["USD", "EUR", "GBP"]).default("USD"),
    contact_name: z.string().max(200).optional(),
    quantity: z.union([z.coerce.number().positive(), z.string().max(500)]).optional(),
    unit: z.string().max(64).optional(),
    deadline: z.string().max(128).optional(),
    session_id: z.string().max(80).optional(),
    product_image: z.string().max(2000).optional(),
  })
  .merge(CatalogRfqFormFields)
  .superRefine((v, ctx) => {
    const hasDesc = Boolean(v.description?.trim());
    const hasProduct = Boolean(v.product_or_service?.trim() || v.category?.trim());
    if (!hasDesc && !hasProduct) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "description or product_or_service is required",
        path: ["description"],
      });
    }
  });

export type CatalogRfqIngestBody = z.infer<typeof CatalogRfqIngestBody>;

function clip(s: string, max: number) {
  return s.trim().slice(0, max);
}

function extractTargetMarket(description: string, intake: CatalogIntakeDTO): string {
  if (intake.deliveryLocation) return clip(intake.deliveryLocation, 120);
  const m = description.match(/Delivery location:\s*(.+)/i);
  if (m?.[1]) return clip(m[1], 120);
  const dest = description.match(/Destination:\s*(.+)/i);
  if (dest?.[1]) return clip(dest[1], 120);
  return "International";
}

function parseLineItems(
  description: string,
  category: string,
  qty?: number | string,
  unit?: string,
) {
  const items: { description: string; quantity: number; uom: string; notes?: string }[] = [];
  const section = description.match(/Line items:\n([\s\S]*?)(?:\n\n|$)/);
  if (section?.[1]) {
    for (const line of section[1].split("\n")) {
      if (!line.startsWith("- ")) continue;
      const m = line.match(/^- (.+?) \(product_id: [^)]+\) × (\d+(?:\.\d+)?)(?:\s*[—-]\s*(.+))?/);
      if (m) {
        items.push({
          description: clip(m[1], 500),
          quantity: Math.max(0.01, Number(m[2]) || 1),
          uom: unit || "PCS",
          notes: m[3] ? clip(m[3], 1000) : undefined,
        });
        continue;
      }
      const simple = line.match(/^- (.+?)\s*-\s*(\d+)\s+containers?/i);
      if (simple) {
        items.push({
          description: clip(simple[1], 500),
          quantity: Math.max(0.01, Number(simple[2]) || 1),
          uom: "containers",
        });
      }
    }
  }
  if (!items.length) {
    const details = description.match(/Request details:\n([\s\S]*?)(?:\n\n[A-Za-z][^\n]*:|$)/i);
    if (details?.[1]) {
      for (const line of details[1].split("\n")) {
        if (!line.startsWith("- ")) continue;
        const text = clip(line.slice(2).trim(), 500);
        if (!text) continue;
        const numQty = typeof qty === "number" ? qty : Number(qty);
        items.push({
          description: text,
          quantity: numQty > 0 ? numQty : 1,
          uom: unit || "PCS",
        });
      }
    }
  }
  if (!items.length) {
    const numQty = typeof qty === "number" ? qty : Number(qty);
    items.push({
      description: clip(category || "Catalog RFQ", 500) || "Catalog RFQ",
      quantity: numQty > 0 ? numQty : 1,
      uom: unit || "PCS",
    });
  }
  return items;
}

function resolveDeadline(raw?: string): string {
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime()) && d > new Date()) return d.toISOString();
  }
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 14);
  return d.toISOString();
}

function enrichIntakeFromDescription(intake: CatalogIntakeDTO, description: string): CatalogIntakeDTO {
  const desc = description.trim();
  if (!desc) return intake;

  const pick = (re: RegExp) => desc.match(re)?.[1]?.trim();

  return {
    ...intake,
    productOrService: intake.productOrService ?? pick(/Product \/ service:\s*(.+)/i) ?? pick(/Product or service:\s*(.+)/i),
    deliveryLocation: intake.deliveryLocation ?? pick(/Delivery location:\s*(.+)/i) ?? pick(/Destination:\s*(.+)/i),
    quantity: intake.quantity ?? pick(/Quantity:\s*(.+)/i),
    supplierType: intake.supplierType ?? pick(/Supplier type:\s*(.+)/i),
    requestDetails: intake.requestDetails ?? (() => {
      const block = desc.match(/Request details:\n([\s\S]*?)(?:\n\n[A-Za-z]|$)/i)?.[1]?.trim();
      return block || undefined;
    })(),
    businessEmail: intake.businessEmail ?? pick(/Business email:\s*(.+)/i),
    companyName: intake.companyName ?? pick(/Company:\s*(.+)/i) ?? pick(/Company name:\s*(.+)/i),
    contactPerson: intake.contactPerson ?? pick(/Contact person:\s*(.+)/i),
    phone: intake.phone ?? pick(/Phone:\s*(.+)/i),
    sessionId: intake.sessionId ?? pick(/DeMaxtore session_id:\s*(\S+)/i),
  };
}

function supplementalBlocks(rawDescription: string): string[] {
  const desc = rawDescription.trim();
  if (!desc) return [];
  if (/Catalog request:/i.test(desc)) {
    const idx = desc.search(/\n\n(?:Line items:|Shipping Info:)/i);
    return idx >= 0 ? [desc.slice(idx).trim()] : [];
  }
  return [desc];
}

function toDraftInput(body: CatalogRfqIngestBody): {
  draft: z.infer<typeof CreateRfqDraftInput>;
  catalogIntake: CatalogIntakeDTO;
} {
  const rawDesc = body.description?.trim() ?? "";
  let intake = catalogIntakeFromIngestBody(body);
  intake = enrichIntakeFromDescription(intake, rawDesc);

  const category = clip(intake.productOrService ?? body.category ?? "Catalog", 120) || "Catalog";
  const company = intake.companyName?.trim();
  const title = clip(
    body.title?.trim()
      || (company ? `${company} — DeMaxtore catalog` : `${category} — DeMaxtore catalog`),
    200,
  );

  const productDescription = /Catalog request:/i.test(rawDesc)
    ? clip(rawDesc, 5000)
    : clip(
        buildCatalogProductDescription(intake, supplementalBlocks(rawDesc)),
        5000,
      );

  const numQty = typeof body.quantity === "number" ? body.quantity : Number(body.quantity);
  const draft = CreateRfqDraftInput.parse({
    title: title.length >= 3 ? title : `${title} RFQ`.slice(0, 200),
    productCategory: category,
    productDescription: productDescription.length >= 10
      ? productDescription
      : `${productDescription}\n\n(Catalog RFQ)`.slice(0, 5000),
    targetMarket: extractTargetMarket(rawDesc || productDescription, intake),
    incoterm: "FOB",
    currency: body.currency,
    deadlineAt: resolveDeadline(body.deadline),
    lineItems: parseLineItems(rawDesc || productDescription, category, body.quantity, body.unit),
  });

  return { draft, catalogIntake: intake };
}

async function resolveBuyerActor(contactEmail: string): Promise<AuthUser> {
  const email = contactEmail.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, role: "BUYER" },
    select: { id: true, email: true, role: true },
  });
  if (user) return { id: user.id, email: user.email, role: "BUYER" };

  const fallback = (process.env.CATALOG_RFQ_FALLBACK_BUYER_EMAIL ?? "buyer@dema.test").trim().toLowerCase();
  const fallbackUser = await prisma.user.findFirst({
    where: { email: { equals: fallback, mode: "insensitive" }, role: "BUYER" },
    select: { id: true, email: true, role: true },
  });
  if (fallbackUser) return { id: fallbackUser.id, email: fallbackUser.email, role: "BUYER" };

  throw new AppError(503, "CATALOG_RFQ_BUYER_NOT_CONFIGURED");
}

async function findExistingWorkspaceId(sessionId: string): Promise<string | null> {
  const ev = await prisma.timelineEvent.findFirst({
    where: {
      eventType: "catalog.rfq.ingested",
      payload: { path: ["catalogSessionId"], equals: sessionId },
    },
    select: { workspaceId: true },
    orderBy: { createdAt: "desc" },
  });
  return ev?.workspaceId ?? null;
}

const service = new RfqService(prisma);

export async function ingestCatalogRfq(raw: unknown) {
  const body = CatalogRfqIngestBody.parse(raw);

  if (body.session_id) {
    const existingId = await findExistingWorkspaceId(body.session_id);
    if (existingId) {
      const dto = await service.fetchDTO(existingId);
      return { ok: true as const, duplicate: true, workspace: dto };
    }
  }

  const actor = await resolveBuyerActor(body.contact_email);
  const { draft, catalogIntake } = toDraftInput(body);
  const created = (await service.createDraft(draft, actor)) as { id: string };

  const productImageUrl = body.product_image?.trim() || catalogIntake.productImageUrl?.trim() || undefined;
  const catalogIntakeStored = productImageUrl
    ? { ...catalogIntake, productImageUrl }
    : catalogIntake;

  await prisma.workspace.update({
    where: { id: created.id },
    data: {
      metadata: {
        catalogIntake: catalogIntakeStored,
        ...(productImageUrl ? { productImageUrl } : {}),
      },
    },
  });

  if (body.session_id) {
    await prisma.timelineEvent.create({
      data: {
        workspaceId: created.id,
        eventType: "catalog.rfq.ingested",
        actorUserId: actor.id,
        payload: {
          catalogSessionId: body.session_id,
          contactEmail: body.contact_email,
          contactName: body.contact_name ?? catalogIntake.contactPerson ?? null,
          companyName: catalogIntake.companyName ?? null,
          source: "demaxtore.com",
          catalogIntake,
        },
      },
    });
  }

  await service.applyTransition({
    workspaceId: created.id,
    action: "submit_rfq",
    actor,
    idempotencyKey: body.session_id ? `catalog-rfq:${body.session_id}` : undefined,
  });

  const dto = await service.fetchDTO(created.id);
  return { ok: true as const, duplicate: false, workspace: dto };
}
