import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
export const RESULTS_PATH = path.join(root, "..", "results", "latest.json");

export async function writeResults(data, filePath = RESULTS_PATH) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), ...data };
  await fs.writeFile(
    filePath,
    JSON.stringify(payload, (_k, v) => (typeof v === "bigint" ? Number(v) : v), 2),
  );
  return payload;
}

export async function readResults() {
  const raw = await fs.readFile(RESULTS_PATH, "utf8");
  return JSON.parse(raw);
}
