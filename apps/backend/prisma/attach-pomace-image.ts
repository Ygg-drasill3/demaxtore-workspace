import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { writeStoredFile } from "../src/lib/file-storage.js";

const prisma = new PrismaClient();
const file = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "assets/mc-products/mc-product-pomace-olive-oil.jpg",
);

async function main() {
  const buf = await fs.readFile(file);
  const { storageKey } = await writeStoredFile(buf, "mc-product-pomace-olive-oil.jpg");
  const updated = await prisma.catalogProduct.update({
    where: { productRef: "MC-OLO-02" },
    data: { imageStorageKey: storageKey, imageMimeType: "image/jpeg" },
    select: { productRef: true, name: true, imageStorageKey: true },
  });
  console.log("OK", updated.productRef, updated.name, storageKey, `(${buf.length} bytes)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
