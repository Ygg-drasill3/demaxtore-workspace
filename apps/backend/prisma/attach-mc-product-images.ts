/**
 * Attach Mixed Container product images from prisma/assets/mc-products.
 * Run: npx tsx prisma/attach-mc-product-images.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { writeStoredFile } from "../src/lib/file-storage.js";

const prisma = new PrismaClient();

const ASSETS_DIR =
  process.env.MC_PRODUCT_ASSETS_DIR ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "assets/mc-products");

/** productRef → optimized jpg filename */
const PRODUCTS: { ref: string; file: string }[] = [
  { ref: "MC-PASTA-01", file: "mc-product-spaghetti.jpg" },
  { ref: "MC-PASTA-02", file: "mc-product-penne-rigate.jpg" },
  { ref: "MC-PASTA-03", file: "mc-product-fusilli.jpg" },
  { ref: "MC-PASTA-04", file: "mc-product-big-elbow.jpg" },
  { ref: "MC-PASTA-05", file: "mc-product-small-elbow.jpg" },
  { ref: "MC-PASTA-06", file: "mc-product-vermicelli.jpg" },
  { ref: "MC-PASTA-07", file: "mc-product-farfalle.jpg" },
  { ref: "MC-FLOUR-01", file: "mc-product-all-purpose-flour.jpg" },
  { ref: "MC-FLOUR-02", file: "mc-product-pizza-flour.jpg" },
  { ref: "MC-FLOUR-03", file: "mc-product-cake-flour.jpg" },
  { ref: "MC-FLOUR-04", file: "mc-product-semolina.jpg" },
  { ref: "MC-TOM-01", file: "mc-product-tomato-paste.jpg" },
  { ref: "MC-TOM-02", file: "mc-product-pepper-paste.jpg" },
  { ref: "MC-TOM-03", file: "mc-product-tomato-pepper-mixed-paste.jpg" },
];

async function main() {
  for (const item of PRODUCTS) {
    const filePath = path.join(ASSETS_DIR, item.file);
    const buf = await fs.readFile(filePath);
    const mime = item.file.endsWith(".png") ? "image/png" : "image/jpeg";
    const { storageKey } = await writeStoredFile(buf, item.file);
    const updated = await prisma.catalogProduct.update({
      where: { productRef: item.ref },
      data: { imageStorageKey: storageKey, imageMimeType: mime },
      select: { productRef: true, name: true },
    });
    console.log("OK", updated.productRef, updated.name, `(${buf.length} bytes)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
