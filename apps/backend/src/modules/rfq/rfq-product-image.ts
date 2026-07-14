import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";

type CatalogIntakeRef = { productOrService?: string; productImageUrl?: string } | null;

export type ResolveInput = {
  workspaceId?: string;
  metadata?: unknown;
  /** When false, skip stored metadata (per line-item lookups). Default true. */
  useMetadata?: boolean;
  productCategory?: string;
  productDescription?: string;
  lineItems?: Array<{ description?: string }>;
  catalogIntake?: CatalogIntakeRef;
};

const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, { url: string | null; expiresAt: number }>();

const FALLBACK_JSON_CANDIDATES = [
  () => env.CATALOG_FALLBACK_JSON_PATH,
  () => "/var/www/demaxtore-website/backend/public/products-fallback.json",
  () => "/var/www/demaxtore-website/frontend/public/products-fallback.json",
].map((fn) => fn()).filter((p): p is string => Boolean(p?.trim()));

let fallbackProductsCache: { products: Array<{ name?: string; image?: string | null }>; loadedAt: number } | null = null;
const FALLBACK_FILE_TTL_MS = 30 * 60_000;

const MIN_MATCH_SCORE = 20;

function normalizeTerm(s: string): string {
  return s.trim().toLowerCase();
}

function tokenize(s: string): string[] {
  return normalizeTerm(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/** Drop single-word tokens that are strict substrings of another single-word token (e.g. corn ⊂ popcorn). */
function dedupeSubtokens(tokens: string[]): string[] {
  const phrases = tokens.filter((t) => t.includes(" "));
  const singles = tokens.filter((t) => !t.includes(" "));
  const keptSingles = singles.filter(
    (tok) => !singles.some((other) => other !== tok && other.length > tok.length && other.includes(tok)),
  );
  return [...phrases, ...keptSingles];
}

function absolutizeImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/api/")) return u;
  const base = (env.DEMAXTORE_CATALOG_API_URL ?? "https://demaxtore.com").replace(/\/$/, "");
  return u.startsWith("/") ? `${base}${u}` : `${base}/${u}`;
}

/** Expand "Microwave popcorn corn" → also try "popcorn", "microwave", etc. */
export function expandSearchTerms(terms: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const key = normalizeTerm(t);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const term of terms) {
    add(term);
    for (const tok of tokenize(term)) {
      if (tok.length >= 4) add(tok);
    }
  }

  return dedupeSubtokens(out);
}

/** Collect search terms from RFQ fields, most specific first. */
export function extractProductSearchTerms(input: ResolveInput): string[] {
  const terms: string[] = [];

  const desc = input.productDescription ?? "";
  const lineMatch = desc.match(/^- (.+?) \(product_id:/m);
  if (lineMatch?.[1]) terms.push(lineMatch[1].trim());

  for (const li of input.lineItems ?? []) {
    if (li.description?.trim()) terms.push(li.description.trim());
  }

  if (input.catalogIntake?.productOrService?.trim()) {
    terms.push(input.catalogIntake.productOrService.trim());
  }
  if (input.productCategory?.trim()) terms.push(input.productCategory.trim());

  return expandSearchTerms(terms);
}

export function scoreProductMatch(productName: string, search: string): number {
  const name = normalizeTerm(productName);
  if (!name || !search.trim()) return 0;

  const phrases = expandSearchTerms([search]);
  const searchTokens = dedupeSubtokens(phrases.flatMap((p) => tokenize(p)));
  let best = 0;

  for (const raw of phrases) {
    const norm = normalizeTerm(raw);
    if (!norm) continue;
    if (name === norm) best = Math.max(best, 100);
    else if (norm.length >= 4 && name.includes(norm)) best = Math.max(best, 35 + Math.min(norm.length, 20));
    else if (name.length >= 4 && norm.includes(name)) best = Math.max(best, 25 + Math.min(name.length, 15));
  }

  for (const tok of searchTokens) {
    if (tok.length < 4) continue;
    if (name === tok) best = Math.max(best, 70);
    else if (name.includes(tok)) best = Math.max(best, 30 + Math.min(tok.length, 10));
  }

  return best;
}

function pickBestMatch(
  products: Array<{ name?: string; image?: string | null }>,
  search: string,
): string | null {
  if (!products.length || !search.trim()) return null;

  let best: { score: number; image: string } | null = null;
  for (const p of products) {
    const score = scoreProductMatch(p.name ?? "", search);
    const image = p.image?.trim();
    if (!image || score < MIN_MATCH_SCORE) continue;
    if (!best || score > best.score) best = { score, image };
  }

  return best ? absolutizeImageUrl(best.image) : null;
}

/** 1. Stored metadata from ingest (highest priority). */
export function resolveFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;

  if (typeof m.productImageUrl === "string") {
    const url = absolutizeImageUrl(m.productImageUrl);
    if (url) return url;
  }

  const intake = m.catalogIntake;
  if (intake && typeof intake === "object") {
    const img = (intake as Record<string, unknown>).productImageUrl;
    if (typeof img === "string") {
      const url = absolutizeImageUrl(img);
      if (url) return url;
    }
  }

  return null;
}

async function resolveFromMixedContainerCatalog(search: string): Promise<string | null> {
  const terms = expandSearchTerms([search]);
  for (const term of terms) {
    const product = await prisma.catalogProduct.findFirst({
      where: {
        imageStorageKey: { not: null },
        status: "ACTIVE",
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { productRef: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    if (!product) continue;
    if (scoreProductMatch(product.name, search) >= MIN_MATCH_SCORE) {
      return `/api/mixed-container/catalog/products/${product.id}/image`;
    }
  }
  return null;
}

async function resolveFromRfqAttachments(workspaceId: string): Promise<string | null> {
  const att = await prisma.rfqAttachment.findFirst({
    where: {
      workspaceId,
      mimeType: { startsWith: "image/" },
    },
    orderBy: { uploadedAt: "desc" },
    select: { id: true },
  });
  if (!att) return null;
  return `/api/rfq/${workspaceId}/attachments/${att.id}`;
}

function resolveFallbackJsonPath(): string | null {
  for (const p of FALLBACK_JSON_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function loadFallbackProducts(): Promise<Array<{ name?: string; image?: string | null }>> {
  if (fallbackProductsCache && Date.now() - fallbackProductsCache.loadedAt < FALLBACK_FILE_TTL_MS) {
    return fallbackProductsCache.products;
  }
  const path = resolveFallbackJsonPath();
  if (!path) return [];

  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as { products?: Array<{ name?: string; image?: string | null }> };
    const products = Array.isArray(parsed.products) ? parsed.products : [];
    fallbackProductsCache = { products, loadedAt: Date.now() };
    return products;
  } catch {
    return [];
  }
}

async function resolveFromLocalCatalogFallback(search: string): Promise<string | null> {
  const products = await loadFallbackProducts();
  return pickBestMatch(products, search);
}

async function resolveFromDemaxtoreCatalogApi(search: string): Promise<string | null> {
  const terms = expandSearchTerms([search]);
  const base = (env.DEMAXTORE_CATALOG_API_URL ?? "https://demaxtore.com").replace(/\/$/, "");

  for (const term of terms) {
    const url = `${base}/api/products?search=${encodeURIComponent(term)}&limit=12`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(6_000) });
      if (!resp.ok) continue;
      const data = (await resp.json()) as { products?: Array<{ name?: string; image?: string | null }> };
      const match = pickBestMatch(data.products ?? [], search);
      if (match) return match;
    } catch {
      continue;
    }
  }
  return null;
}

async function resolveByTerms(input: ResolveInput): Promise<string | null> {
  const terms = extractProductSearchTerms(input);
  if (!terms.length) return null;

  const cacheKey = [
    input.workspaceId ?? "",
    input.useMetadata === false ? "line" : "rfq",
    ...terms.map(normalizeTerm),
  ].join("|");

  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  let resolved: string | null = null;

  for (const term of terms) {
    resolved = await resolveFromMixedContainerCatalog(term);
    if (resolved) break;
  }

  if (!resolved && input.workspaceId && input.useMetadata !== false) {
    resolved = await resolveFromRfqAttachments(input.workspaceId);
  }

  if (!resolved) {
    for (const term of terms) {
      resolved = await resolveFromLocalCatalogFallback(term);
      if (resolved) break;
    }
  }

  if (!resolved) {
    for (const term of terms) {
      resolved = await resolveFromDemaxtoreCatalogApi(term);
      if (resolved) break;
    }
  }

  cache.set(cacheKey, { url: resolved, expiresAt: Date.now() + CACHE_TTL_MS });
  return resolved;
}

/** Resolve image for a single RFQ line (no metadata shortcut). */
export async function resolveLineItemProductImageUrl(
  workspaceId: string,
  description: string,
): Promise<string | null> {
  return resolveByTerms({
    workspaceId,
    useMetadata: false,
    productCategory: description,
    lineItems: [{ description }],
  });
}

/**
 * Resolve product hero image URL for an RFQ.
 * Priority: metadata → mixed-container catalog → RFQ attachments → local JSON → demaxtore API.
 */
export async function resolveRfqProductImageUrl(input: ResolveInput): Promise<string | null> {
  if (input.useMetadata !== false) {
    const fromMeta = resolveFromMetadata(input.metadata);
    if (fromMeta) return fromMeta;

    if (input.catalogIntake?.productImageUrl?.trim()) {
      const url = absolutizeImageUrl(input.catalogIntake.productImageUrl);
      if (url) return url;
    }
  }

  return resolveByTerms(input);
}
