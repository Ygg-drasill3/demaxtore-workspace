import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { writeStoredFile } from "../src/lib/file-storage.js";

const prisma = new PrismaClient();

const ASSETS_DIR =
  process.env.MC_CATEGORY_ASSETS_DIR ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "assets/mc-categories");

const assets = [
  { slug: "pasta", file: "mc-category-pasta.jpg" },
  { slug: "wheat-flour", file: "mc-category-wheat-flour.jpg" },
  { slug: "tomato-paste", file: "mc-category-tomato-paste.jpg" },
];

async function main() {
  for (const a of assets) {
    const filePath = path.join(ASSETS_DIR, a.file);
    const buf = await fs.readFile(filePath);
    const mime = a.file.endsWith(".png") ? "image/png" : "image/jpeg";
    const { storageKey } = await writeStoredFile(buf, a.file);
    const updated = await prisma.catalogCategory.update({
      where: { slug: a.slug },
      data: { imageStorageKey: storageKey, imageMimeType: mime },
      select: { id: true, slug: true, imageStorageKey: true },
    });
    console.log("OK", updated.slug, updated.id, storageKey, `(${buf.length} bytes)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
