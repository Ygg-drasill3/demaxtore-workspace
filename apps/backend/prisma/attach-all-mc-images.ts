/**
 * Compress + attach all Mixed Container category & product images.
 * Source PNGs: assets dir (cursor or env). Writes optimized JPEGs under prisma/assets.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { writeStoredFile } from "../src/lib/file-storage.js";

const prisma = new PrismaClient();
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC =
  process.env.MC_IMAGE_SRC ??
  "/root/.cursor/projects/var-www-demaxtore-DemaxtoreSolitions-main/assets";
const CAT_OUT = path.join(ROOT, "assets/mc-categories");
const PROD_OUT = path.join(ROOT, "assets/mc-products");

const CATEGORIES: { slug: string; file: string }[] = [
  { slug: "pasta", file: "mc-category-pasta" },
  { slug: "wheat-flour", file: "mc-category-wheat-flour" },
  { slug: "tomato-paste", file: "mc-category-tomato-paste" },
  { slug: "sunflower-oil", file: "mc-category-sunflower-oil" },
  { slug: "olive-oil", file: "mc-category-olive-oil" },
  { slug: "pulses", file: "mc-category-pulses" },
  { slug: "pickles", file: "mc-category-pickles" },
  { slug: "fruit-juices", file: "mc-category-fruit-juices" },
  { slug: "bulgur", file: "mc-category-bulgur" },
  { slug: "grape-leaves", file: "mc-category-grape-leaves" },
  { slug: "roasted-eggplant", file: "mc-category-roasted-eggplant" },
  { slug: "roasted-red-peppers", file: "mc-category-roasted-red-peppers" },
];

const PRODUCTS: { ref: string; file: string }[] = [
  { ref: "MC-PASTA-01", file: "mc-product-spaghetti" },
  { ref: "MC-PASTA-02", file: "mc-product-penne-rigate" },
  { ref: "MC-PASTA-03", file: "mc-product-fusilli" },
  { ref: "MC-PASTA-04", file: "mc-product-big-elbow" },
  { ref: "MC-PASTA-05", file: "mc-product-small-elbow" },
  { ref: "MC-PASTA-06", file: "mc-product-vermicelli" },
  { ref: "MC-PASTA-07", file: "mc-product-farfalle" },
  { ref: "MC-FLOUR-01", file: "mc-product-all-purpose-flour" },
  { ref: "MC-FLOUR-02", file: "mc-product-pizza-flour" },
  { ref: "MC-FLOUR-03", file: "mc-product-cake-flour" },
  { ref: "MC-FLOUR-04", file: "mc-product-semolina" },
  { ref: "MC-TOM-01", file: "mc-product-tomato-paste" },
  { ref: "MC-TOM-02", file: "mc-product-pepper-paste" },
  { ref: "MC-TOM-03", file: "mc-product-tomato-pepper-mixed-paste" },
  { ref: "MC-SFO-01", file: "mc-product-refined-sunflower-oil" },
  { ref: "MC-OLO-01", file: "mc-product-extra-virgin-olive-oil" },
  { ref: "MC-OLO-02", file: "mc-product-pomace-olive-oil" },
  { ref: "MC-PUL-RL", file: "mc-product-red-lentils" },
  { ref: "MC-PUL-CH", file: "mc-product-chickpeas" },
  { ref: "MC-PUL-WB", file: "mc-product-white-beans" },
  { ref: "MC-PUL-BE", file: "mc-product-black-eyed-peas" },
  { ref: "MC-PUL-SP", file: "mc-product-split-peas" },
  { ref: "MC-PKL-01", file: "mc-product-cucumber-pickles" },
  { ref: "MC-PKL-02", file: "mc-product-pepper-pickles" },
  { ref: "MC-PKL-03", file: "mc-product-mixed-pickles" },
  { ref: "MC-PKL-04", file: "mc-product-pepper-pickles" },
  { ref: "MC-PKL-05", file: "mc-product-mixed-pickles" },
  { ref: "MC-PKL-06", file: "mc-product-gherkin-pickles" },
  { ref: "MC-PKL-07", file: "mc-product-beetroot-pickles" },
  { ref: "MC-PKL-08", file: "mc-product-pepper-pickles" },
  { ref: "MC-PKL-09", file: "mc-product-mixed-pickles" },
  { ref: "MC-JUI-ORA", file: "mc-product-orange-juice" },
  { ref: "MC-JUI-APP", file: "mc-product-apple-juice" },
  { ref: "MC-JUI-PEA", file: "mc-product-peach-juice" },
  { ref: "MC-JUI-APR", file: "mc-product-apricot-juice" },
  { ref: "MC-JUI-MIX", file: "mc-product-mixed-fruit-juice" },
  { ref: "MC-JUI-POM", file: "mc-product-pomegranate-juice" },
  { ref: "MC-BUL-01", file: "mc-product-coarse-bulgur" },
  { ref: "MC-BUL-02", file: "mc-product-fine-bulgur" },
  { ref: "MC-BUL-03", file: "mc-product-pilavlik-bulgur" },
  { ref: "MC-GRL-01", file: "mc-product-brined-grape-leaves" },
  { ref: "MC-EGG-SMK", file: "mc-product-smoky-roasted-eggplant" },
  { ref: "MC-PEP-WHL", file: "mc-product-whole-roasted-red-peppers" },
];

function compress(srcPng: string, destJpg: string, maxW: number, quality: number) {
  execFileSync(
    "python3",
    [
      "-c",
      `
from PIL import Image
im = Image.open(${JSON.stringify(srcPng)}).convert("RGB")
w,h = im.size
tw = ${maxW}
if w > tw:
  im = im.resize((tw, int(h*tw/w)), Image.Resampling.LANCZOS)
im.save(${JSON.stringify(destJpg)}, "JPEG", quality=${quality}, optimize=True)
`,
    ],
    { stdio: "inherit" },
  );
}

async function findSource(base: string): Promise<string | null> {
  for (const ext of [".png", ".jpg", ".jpeg"]) {
    const p = path.join(SRC, base + ext);
    try {
      await fs.access(p);
      return p;
    } catch {
      /* continue */
    }
  }
  // also check already-optimized outs
  for (const dir of [CAT_OUT, PROD_OUT]) {
    const p = path.join(dir, base + ".jpg");
    try {
      await fs.access(p);
      return p;
    } catch {
      /* continue */
    }
  }
  return null;
}

async function main() {
  await fs.mkdir(CAT_OUT, { recursive: true });
  await fs.mkdir(PROD_OUT, { recursive: true });

  for (const c of CATEGORIES) {
    const src = await findSource(c.file);
    if (!src) {
      console.warn("SKIP category missing source", c.slug, c.file);
      continue;
    }
    const dest = path.join(CAT_OUT, c.file + ".jpg");
    compress(src, dest, 960, 72);
    const buf = await fs.readFile(dest);
    const { storageKey } = await writeStoredFile(buf, c.file + ".jpg");
    await prisma.catalogCategory.update({
      where: { slug: c.slug },
      data: { imageStorageKey: storageKey, imageMimeType: "image/jpeg" },
    });
    console.log("CAT", c.slug, `${buf.length}b`);
  }

  for (const p of PRODUCTS) {
    const src = await findSource(p.file);
    if (!src) {
      console.warn("SKIP product missing source", p.ref, p.file);
      continue;
    }
    const dest = path.join(PROD_OUT, p.file + ".jpg");
    compress(src, dest, 720, 70);
    const buf = await fs.readFile(dest);
    const { storageKey } = await writeStoredFile(buf, p.file + ".jpg");
    await prisma.catalogProduct.update({
      where: { productRef: p.ref },
      data: { imageStorageKey: storageKey, imageMimeType: "image/jpeg" },
    });
    console.log("PROD", p.ref, `${buf.length}b`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
