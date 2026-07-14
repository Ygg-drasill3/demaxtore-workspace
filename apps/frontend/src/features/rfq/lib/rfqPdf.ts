import type { RfqDTO } from "@dmx/contracts/rfq.zod";
import type { CatalogIntakeDTO } from "@dmx/contracts/catalog-rfq-intake";
import { parseRfqDescription, type ParsedSection } from "./rfqDescription.parse";
import { resolveCatalogIntake } from "./catalogIntake";

/** Extended RFQ payload available from workspace API. */
export type RfqPdfSource = RfqDTO & {
  participants?: Array<{ userId: string; participantRole: string }>;
  selectedQuotationId?: string | null;
};

type PdfDoc = {
  y: number;
  x: number;
  addPage: (options?: { size?: string; margin?: number }) => void;
  font: (name: string) => PdfDoc;
  fontSize: (size: number) => PdfDoc;
  fillColor: (color: string) => PdfDoc;
  text: (text: string, x?: number, y?: number, options?: Record<string, unknown>) => PdfDoc;
  heightOfString: (text: string, options?: { width?: number }) => number;
  roundedRect: (x: number, y: number, w: number, h: number, r: number) => { fillAndStroke: (fill: string, stroke: string) => void };
  rect: (x: number, y: number, w: number, h: number) => { fill: (color: string) => void };
  moveDown: (lines?: number) => void;
  moveTo: (x: number, y: number) => PdfDoc;
  lineTo: (x: number, y: number) => PdfDoc;
  strokeColor: (color: string) => PdfDoc;
  stroke: () => void;
  pipe: (stream: unknown) => unknown;
  end: () => void;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PAGE_BOTTOM = PAGE_H - MARGIN;

const INK = "#0f172a";
const MUTED = "#64748b";
const ACCENT = "#2563eb";
const BORDER = "#e2e8f0";
const FIELD_BG = "#f8fafc";
const HEADER_BG = "#0f172a";

type BlobStream = {
  on: (event: "finish" | "error", cb: (err?: unknown) => void) => void;
  toBlob: (mimeType: string) => Blob;
};

type CatalogPdfField = Exclude<keyof CatalogIntakeDTO, "productImageUrl">;

const PDF_FIELD_LABELS: Record<CatalogPdfField, { label: string; required?: boolean }> = {
  productOrService: { label: "Product or service", required: true },
  deliveryLocation: { label: "Delivery location", required: true },
  quantity: { label: "Quantity", required: true },
  supplierType: { label: "Supplier type" },
  requestDetails: { label: "Request details", required: true },
  businessEmail: { label: "Business email", required: true },
  companyName: { label: "Company name", required: true },
  contactPerson: { label: "Contact person" },
  phone: { label: "Phone" },
  sessionId: { label: "Session ID" },
};

function dash(value: unknown) {
  if (value == null || String(value).trim() === "") return "—";
  return String(value).trim();
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stateLabel(state: string) {
  return state.replace(/_/g, " ");
}

function slugPart(s: string) {
  return s.trim().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "RFQ";
}

function pdfFileName(rfq: RfqPdfSource, intake: CatalogIntakeDTO | null) {
  const company = slugPart(intake?.companyName ?? rfq.title.split("—")[0]?.trim() ?? "Buyer");
  const ref = slugPart(intake?.sessionId ?? rfq.externalRef);
  const date = (rfq.createdAt ?? new Date().toISOString()).slice(0, 10);
  return `DeMaxtore-RFQ-${company}-${ref}-${date}.pdf`;
}

function publicRef(rfq: RfqPdfSource, intake: CatalogIntakeDTO | null) {
  return intake?.sessionId ?? rfq.externalRef;
}

function specSections(rfq: RfqPdfSource): ParsedSection[] {
  const skip = new Set([
    "catalog request",
    "your contact details",
    "line items",
    "request details",
    "quantity",
    "system info",
  ]);
  const parsed = parseRfqDescription(rfq.productDescription, { includeAll: true });
  return parsed.sections.filter((s) => !skip.has(s.key));
}

function ensureSpace(doc: PdfDoc, needed: number) {
  if (doc.y + needed > PAGE_BOTTOM) {
    doc.addPage({ size: "A4", margin: MARGIN });
  }
}

function measureFieldBlock(
  doc: PdfDoc,
  label: string,
  value: string,
  width: number,
  required = false,
) {
  const labelText = required ? `${label.toUpperCase()} *` : label.toUpperCase();
  doc.font("Helvetica-Bold").fontSize(7);
  const labelH = doc.heightOfString(labelText, { width });
  doc.font("Helvetica").fontSize(10);
  const textH = doc.heightOfString(dash(value), { width: width - 16 });
  return labelH + textH + 26;
}

function drawFieldBlock(
  doc: PdfDoc,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  required = false,
) {
  const labelText = required ? `${label.toUpperCase()} *` : label.toUpperCase();
  doc.font("Helvetica-Bold").fontSize(7).fillColor(MUTED).text(labelText, x, y, { width });
  const boxY = y + 11;
  const text = dash(value);
  doc.font("Helvetica").fontSize(10).fillColor(INK);
  const boxH = doc.heightOfString(text, { width: width - 16 }) + 16;
  ensureSpace(doc, boxH + 24);
  doc.roundedRect(x, boxY, width, boxH, 4).fillAndStroke(FIELD_BG, BORDER);
  doc.fillColor(INK).text(text, x + 8, boxY + 8, { width: width - 16 });
  return boxY + boxH + 10;
}

function drawSectionTitle(doc: PdfDoc, title: string) {
  ensureSpace(doc, 28);
  const y = doc.y;
  doc.rect(MARGIN, y, 3, 14).fill(ACCENT);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(title, MARGIN + 10, y + 1);
  doc.y = y + 22;
}

function drawHeader(doc: PdfDoc, rfq: RfqPdfSource, intake: CatalogIntakeDTO | null) {
  doc.rect(0, 0, PAGE_W, 80).fill(HEADER_BG);
  doc.rect(0, 80, PAGE_W, 3).fill(ACCENT);

  const company = intake?.companyName?.trim() || rfq.title.split("—")[0]?.trim() || rfq.ownerName || "Buyer";

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff").text("DEMAXTORE", MARGIN, 22);
  doc.font("Helvetica").fontSize(7).fillColor("#cbd5e1").text("B2B Sourcing & Import Operating Platform", MARGIN, 34);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#ffffff").text("Request for Quotation", MARGIN, 52);
  doc.font("Helvetica").fontSize(10).fillColor("#ffffff").text(company, MARGIN, 24, { width: CONTENT_W, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#cbd5e1")
    .text(`RFQ ${publicRef(rfq, intake)}`, MARGIN, 54, { width: CONTENT_W, align: "right" });

  doc.y = 95;
  doc.font("Helvetica").fontSize(8).fillColor(MUTED);
  doc.text(`Date: ${fmtDate(rfq.createdAt)}  ·  Status: ${stateLabel(rfq.state)}`, MARGIN, doc.y, {
    continued: true,
  });
  doc.text(`Deadline: ${fmtDateTime(rfq.deadlineAt)}`, MARGIN, doc.y, { width: CONTENT_W, align: "right" });
  doc.moveDown(0.8);
}

function drawFormGrid(
  doc: PdfDoc,
  fields: Array<{ key: keyof CatalogIntakeDTO; label: string; required?: boolean }>,
  intake: CatalogIntakeDTO | null,
  fullWidthKey?: keyof CatalogIntakeDTO,
) {
  const colW = (CONTENT_W - 12) / 2;
  const normal = fields.filter((f) => f.key !== fullWidthKey);

  for (let i = 0; i < normal.length; i += 2) {
    const left = normal[i]!;
    const right = normal[i + 1];
    const leftVal = dash(intake?.[left.key]);
    const rightVal = right ? dash(intake?.[right.key]) : "";
    const rowH = Math.max(
      measureFieldBlock(doc, left.label, leftVal, colW, left.required),
      right ? measureFieldBlock(doc, right.label, rightVal, colW, right.required) : 0,
    );
    ensureSpace(doc, rowH);
    const rowY = doc.y;
    const leftBottom = drawFieldBlock(doc, left.label, leftVal, MARGIN, rowY, colW, left.required);
    const rightBottom = right
      ? drawFieldBlock(doc, right.label, rightVal, MARGIN + colW + 12, rowY, colW, right.required)
      : rowY;
    doc.y = Math.max(leftBottom, rightBottom);
  }

  if (fullWidthKey) {
    const field = fields.find((f) => f.key === fullWidthKey);
    if (field) {
      const val = dash(intake?.[field.key]);
      ensureSpace(doc, measureFieldBlock(doc, field.label, val, CONTENT_W, field.required));
      doc.y = drawFieldBlock(doc, field.label, val, MARGIN, doc.y, CONTENT_W, field.required);
    }
  }
}

function drawSpecSections(doc: PdfDoc, sections: ParsedSection[]) {
  if (!sections.length) return;
  drawSectionTitle(doc, "Shipping & logistics");
  const colW = (CONTENT_W - 12) / 2;

  for (const section of sections) {
    ensureSpace(doc, 20);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(section.title, MARGIN, doc.y);
    doc.moveDown(0.4);

    for (let i = 0; i < section.fields.length; i += 2) {
      const left = section.fields[i]!;
      const right = section.fields[i + 1];
      const rowH = Math.max(
        measureFieldBlock(doc, left.label, left.value, colW),
        right ? measureFieldBlock(doc, right.label, right.value, colW) : 0,
      );
      ensureSpace(doc, rowH);
      const rowY = doc.y;
      const leftBottom = drawFieldBlock(doc, left.label, left.value, MARGIN, rowY, colW);
      const rightBottom = right
        ? drawFieldBlock(doc, right.label, right.value, MARGIN + colW + 12, rowY, colW)
        : rowY;
      doc.y = Math.max(leftBottom, rightBottom);
    }

    for (const bullet of section.bullets) {
      ensureSpace(doc, 16);
      doc.font("Helvetica").fontSize(9).fillColor("#334155").text(`• ${bullet}`, MARGIN + 4, doc.y, {
        width: CONTENT_W - 8,
      });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.3);
  }
}

function drawLineItems(doc: PdfDoc, items: RfqDTO["lineItems"]) {
  drawSectionTitle(doc, "Line items");
  const cols = [
    { label: "#", w: 28 },
    { label: "Description", w: 200 },
    { label: "Qty", w: 52 },
    { label: "Unit", w: 48 },
    { label: "Notes", w: CONTENT_W - 328 },
  ];

  ensureSpace(doc, 24);
  const headerY = doc.y;
  doc.rect(MARGIN, headerY, CONTENT_W, 18).fill("#f1f5f9");
  let x = MARGIN + 6;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(MUTED);
  for (const col of cols) {
    doc.text(col.label.toUpperCase(), x, headerY + 5, { width: col.w - 8 });
    x += col.w;
  }
  doc.y = headerY + 22;

  if (!items?.length) {
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("No line items", MARGIN + 6, doc.y);
    doc.moveDown(0.8);
    return;
  }

  for (const line of items) {
    const cells = [
      String(line.position),
      dash(line.description),
      String(line.quantity),
      dash(line.uom),
      dash(line.notes),
    ];
    let rowH = 18;
    const wrapped = cells.map((cell, idx) => {
      doc.font("Helvetica").fontSize(9);
      const h = doc.heightOfString(cell, { width: cols[idx]!.w - 10 });
      rowH = Math.max(rowH, h + 10);
      return cell;
    });
    ensureSpace(doc, rowH + 4);
    const rowY = doc.y;
    x = MARGIN + 6;
    doc.font("Helvetica").fontSize(9).fillColor(INK);
    for (let i = 0; i < cols.length; i++) {
      doc.text(wrapped[i]!, x, rowY + 4, { width: cols[i]!.w - 10 });
      x += cols[i]!.w;
    }
    doc
      .moveTo(MARGIN, rowY + rowH)
      .lineTo(MARGIN + CONTENT_W, rowY + rowH)
      .strokeColor(BORDER)
      .stroke();
    doc.y = rowY + rowH + 2;
  }
  doc.moveDown(0.4);
}

function drawCommercialStrip(doc: PdfDoc, rfq: RfqPdfSource) {
  ensureSpace(doc, 34);
  const y = doc.y;
  doc.roundedRect(MARGIN, y, CONTENT_W, 24, 4).fillAndStroke(FIELD_BG, BORDER);
  const parts = [
    `Currency: ${dash(rfq.currency)}`,
    `Incoterm: ${dash(rfq.incoterm)}`,
    `Target market: ${dash(rfq.targetMarket)}`,
    `Category: ${dash(rfq.productCategory)}`,
  ];
  doc.font("Helvetica").fontSize(8).fillColor(INK).text(parts.join("   ·   "), MARGIN + 10, y + 8, {
    width: CONTENT_W - 20,
  });
  doc.y = y + 32;
}

function drawFooter(doc: PdfDoc) {
  ensureSpace(doc, 20);
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(MUTED)
    .text(`Generated ${new Date().toLocaleString()} · demaxtore.com · DeMaxtore Trade OS`, MARGIN, doc.y, {
      width: CONTENT_W,
      align: "center",
    });
}

async function loadPdfKit() {
  const PDFDocument = (await import("pdfkit/js/pdfkit.standalone.js")).default as new (
    options?: Record<string, unknown>,
  ) => PdfDoc;
  const blobStream = (await import("blob-stream")).default;
  return { PDFDocument, blobStream };
}

function renderRfqPdf(PDFDocument: new (options?: Record<string, unknown>) => PdfDoc, rfq: RfqPdfSource): PdfDoc {
  const intake = resolveCatalogIntake(rfq);
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });

  drawHeader(doc, rfq, intake);

  doc.font("Helvetica-Oblique").fontSize(8).fillColor(MUTED).text("Fields marked with * are mandatory.");
  doc.moveDown(0.5);

  drawSectionTitle(doc, "Detailed requirements");
  drawFormGrid(
    doc,
    (["productOrService", "deliveryLocation", "quantity", "supplierType", "requestDetails"] as const).map((key) => ({
      key,
      ...PDF_FIELD_LABELS[key],
    })),
    intake,
    "requestDetails",
  );

  drawSectionTitle(doc, "Your contact details");
  drawFormGrid(
    doc,
    (["businessEmail", "companyName", "contactPerson", "phone"] as const).map((key) => ({
      key,
      ...PDF_FIELD_LABELS[key],
    })),
    intake,
  );

  drawSpecSections(doc, specSections(rfq));
  drawLineItems(doc, rfq.lineItems ?? []);
  drawCommercialStrip(doc, rfq);
  drawFooter(doc);

  return doc;
}

async function buildRfqPdfBlob(rfq: RfqPdfSource): Promise<{ blob: Blob; filename: string }> {
  const { PDFDocument, blobStream } = await loadPdfKit();
  const intake = resolveCatalogIntake(rfq);
  const doc = renderRfqPdf(PDFDocument, rfq);

  return new Promise((resolve, reject) => {
    const stream = doc.pipe(blobStream()) as BlobStream;
    stream.on("finish", () => {
      resolve({
        blob: stream.toBlob("application/pdf"),
        filename: pdfFileName(rfq, intake),
      });
    });
    stream.on("error", reject);
    doc.end();
  });
}

export async function downloadRfqPdf(rfq: RfqPdfSource) {
  const { blob, filename } = await buildRfqPdfBlob(rfq);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function openRfqPdf(rfq: RfqPdfSource) {
  const { blob } = await buildRfqPdfBlob(rfq);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
