export type ParsedField = { label: string; value: string };
export type ParsedSection = {
  key: string;
  title: string;
  fields: ParsedField[];
  bullets: string[];
  prose: string[];
};

const SKIP_SECTION_KEYS_UI = new Set([
  "line items",
  "request details",
  "system info",
  "quantity",
  "catalog request",
  "price quotation request",
  "your contact details",
]);

export type ParseRfqDescriptionOptions = {
  /** When true, include every catalog section (for PDF export). */
  includeAll?: boolean;
};

const SECTION_ALIASES: Record<string, string> = {
  "catalog request": "Price quotation Request",
  "price quotation request": "Price quotation Request",
  "your contact details": "Your contact details",
  "line items": "Catalog line items",
  "request details": "Request details",
  "quantity": "Quantity summary",
  "system info": "System info",
  "shipping info": "Shipping",
  "company info": "Company",
  "logistics / notes": "Logistics & notes",
  "logistics and notes": "Logistics & notes",
  "logistics notes": "Logistics & notes",
};

function normalizeKey(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function displayTitle(title: string) {
  const key = normalizeKey(title);
  return SECTION_ALIASES[key] ?? title.trim();
}

function cleanBullet(raw: string, preserveDetail = false) {
  let text = raw.replace(/^-\s*/, "").trim();
  if (preserveDetail) return text.replace(/\s+/g, " ");
  return text
    .replace(/\s*\(product_id:\s*[^)]+\)/i, "")
    .replace(/\s*×\s*\d+(?:\.\d+)?(?:\s*—\s*|\s*-\s*)?/i, " · ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFieldLine(line: string): ParsedField | null {
  const m = line.match(/^([^:]{1,80}):\s*(.+)$/);
  if (!m) return null;
  return { label: m[1].trim(), value: m[2].trim() };
}

function parseSectionBody(body: string, preserveDetail = false) {
  const fields: ParsedField[] = [];
  const bullets: string[] = [];
  const prose: string[] = [];

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("- ")) {
      const bullet = cleanBullet(line, preserveDetail);
      if (bullet) bullets.push(bullet);
      continue;
    }
    const field = parseFieldLine(line);
    if (field) {
      fields.push(field);
      continue;
    }
    prose.push(line);
  }

  return { fields, bullets, prose };
}

/** Parse catalog-style RFQ descriptions into structured sections. */
export function parseRfqDescription(
  text: string | null | undefined,
  options?: ParseRfqDescriptionOptions,
): {
  sections: ParsedSection[];
  fallbackText: string | null;
} {
  const includeAll = options?.includeAll ?? false;
  const skipKeys = includeAll ? new Set<string>() : SKIP_SECTION_KEYS_UI;
  const source = (text ?? "").trim();
  if (!source) return { sections: [], fallbackText: null };

  const headerRe = /^([A-Za-z][A-Za-z0-9 /&-]{1,48}):\s*$/gm;
  const matches = [...source.matchAll(headerRe)];

  if (matches.length === 0) {
    return { sections: [], fallbackText: source };
  }

  const sections: ParsedSection[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[1];
    const key = normalizeKey(title);
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? source.length) : source.length;
    const body = source.slice(start, end).trim();
    const parsed = parseSectionBody(body, includeAll);

    if (skipKeys.has(key)) continue;

    sections.push({
      key,
      title: displayTitle(title),
      fields: parsed.fields,
      bullets: parsed.bullets,
      prose: parsed.prose,
    });
  }

  if (sections.length === 0) {
    return { sections: [], fallbackText: source };
  }

  return { sections, fallbackText: null };
}

export function dedupeFields(fields: ParsedField[]) {
  const seen = new Set<string>();
  return fields.filter((f) => {
    const k = `${f.label.toLowerCase()}|${f.value.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
