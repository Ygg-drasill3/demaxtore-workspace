#!/usr/bin/env node
/** Append .js to relative imports in dist/ for Node ESM resolution. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, "utf8");
  const fixed = src.replace(
    /(from|export\s+\*\s+from)\s+"(\.[^"]+)"/g,
    (match, kw, spec) => {
      if (spec.endsWith(".js") || spec.endsWith(".json")) return match;
      return `${kw} "${spec}.js"`;
    },
  );
  if (fixed !== src) fs.writeFileSync(filePath, fixed);
}

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.name.endsWith(".js")) fixFile(p);
  }
}

walk(dist);
