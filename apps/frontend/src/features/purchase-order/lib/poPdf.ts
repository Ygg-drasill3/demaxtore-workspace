import type { PurchaseOrderSummary } from "@dmx/contracts/purchase-order";
import { downloadAuthenticatedDocument, openAuthenticatedDocument } from "@/lib/authenticated-file";

const MARGIN = 18;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

function fmtMoney(n: number, currency: string) {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function buildPoPdf(summary: PurchaseOrderSummary) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const po = summary.purchaseOrder;
  const total = summary.lines.reduce((s, l) => s + l.lineTotal, 0);
  let y = MARGIN;

  const addText = (text: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [15, 23, 42]) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * (size * 0.42) + 2;
  };

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE_W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DEMAXTORE TRADE OS", MARGIN, 12);
  doc.setFontSize(18);
  doc.text("Purchase Order", MARGIN, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(po.poNumber, PAGE_W - MARGIN, 22, { align: "right" });
  y = 42;

  addText(`Status: ${po.status}`, 10, "bold", [51, 65, 85]);
  y += 2;

  const meta = [
    ["Issued", fmtDate(po.issuedAt)],
    ["Order ref", po.orderRef ?? po.orderId.slice(0, 8)],
    ["Currency", po.currency],
    ["Incoterm", po.incoterm ?? "—"],
    ["Payment terms", po.paymentTerms ?? "—"],
    ["Delivery terms", po.deliveryTerms ?? "—"],
  ];

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  const colW = CONTENT_W / 2;
  for (let i = 0; i < meta.length; i += 2) {
    const rowY = y;
    for (let c = 0; c < 2; c++) {
      const item = meta[i + c];
      if (!item) continue;
      const x = MARGIN + c * colW;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(item[0].toUpperCase(), x, rowY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(String(item[1]), x, rowY + 5);
    }
    y += 14;
  }
  y += 4;

  // Parties
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, y, CONTENT_W, 28, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(MARGIN, y, CONTENT_W, 28, "S");
  const partyY = y + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("BUYER", MARGIN + 4, partyY);
  doc.text("SUPPLIER", MARGIN + colW + 4, partyY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(po.buyerName ?? "Buyer", MARGIN + 4, partyY + 6);
  doc.text(po.supplierName ?? "Supplier", MARGIN + colW + 4, partyY + 6);
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (po.buyerEmail) doc.text(po.buyerEmail, MARGIN + 4, partyY + 12);
  if (po.supplierEmail) doc.text(po.supplierEmail, MARGIN + colW + 4, partyY + 12);
  y += 36;

  addText("Line items", 11, "bold", [37, 99, 235]);
  y += 2;

  const cols = [
    { label: "SKU", w: 22 },
    { label: "Description", w: 58 },
    { label: "Qty", w: 18 },
    { label: "Unit price", w: 28 },
    { label: "Total", w: 28 },
  ];
  const tableX = MARGIN;
  let cx = tableX;
  doc.setFillColor(241, 245, 249);
  doc.rect(tableX, y, CONTENT_W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  for (const col of cols) {
    doc.text(col.label, cx + 2, y + 5.5);
    cx += col.w;
  }
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  for (const line of summary.lines) {
    if (y > 265) {
      doc.addPage();
      y = MARGIN;
    }
    cx = tableX;
    const cells = [
      line.sku ?? "—",
      line.description,
      String(line.quantity),
      fmtMoney(line.unitPrice, po.currency),
      fmtMoney(line.lineTotal, po.currency),
    ];
    let rowH = 8;
    const wrapped: string[][] = [];
    for (let i = 0; i < cols.length; i++) {
      wrapped.push(doc.splitTextToSize(cells[i], cols[i].w - 4));
      rowH = Math.max(rowH, wrapped[i].length * 4.5 + 3);
    }
    for (let i = 0; i < cols.length; i++) {
      doc.text(wrapped[i], cx + 2, y + 5);
      cx += cols[i].w;
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(tableX, y + rowH, tableX + CONTENT_W, y + rowH);
    y += rowH;
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Grand total", MARGIN, y);
  doc.text(fmtMoney(total, po.currency), PAGE_W - MARGIN, y, { align: "right" });
  y += 10;

  if (summary.revisions.length > 0) {
    addText(`Revision: ${summary.revisions[0].revisionNumber} — ${summary.revisions[0].reason}`, 9, "normal", [71, 85, 105]);
  }

  const footerY = 285;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated ${new Date().toLocaleString()} · DeMaxtore Trade OS · ${po.poNumber}`,
    PAGE_W / 2,
    footerY,
    { align: "center" },
  );

  return { doc, po };
}

function uploadedPoDocument(summary: PurchaseOrderSummary) {
  const po = summary.purchaseOrder;
  if (po.source === "manual" && po.documentUrl) {
    return {
      url: po.documentUrl,
      fileName: po.documentFileName ?? `DeMaxtore-PO-${po.poNumber}.pdf`,
    };
  }
  return null;
}

/** Download PO as PDF file. */
export async function downloadPurchaseOrderPdf(summary: PurchaseOrderSummary) {
  const uploaded = uploadedPoDocument(summary);
  if (uploaded) {
    await downloadAuthenticatedDocument(uploaded.url, uploaded.fileName);
    return;
  }
  const { doc, po } = await buildPoPdf(summary);
  doc.save(`DeMaxtore-PO-${po.poNumber}.pdf`);
}

/** Open PO PDF in a new browser tab. */
export async function openPurchaseOrderPdf(summary: PurchaseOrderSummary) {
  const uploaded = uploadedPoDocument(summary);
  if (uploaded) {
    await openAuthenticatedDocument(uploaded.url);
    return;
  }
  const { doc } = await buildPoPdf(summary);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
