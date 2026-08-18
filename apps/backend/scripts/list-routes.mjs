/**
 * Dump every route Express actually has registered, so frontend call sites can be
 * diffed against reality instead of guessed at.
 *
 * Usage: node scripts/list-routes.mjs   (from apps/backend, after a build)
 */
import { buildApp } from "../dist/app.js";

function layerPath(layer) {
  if (layer.route) return layer.route.path;
  if (!layer.regexp) return "";
  // Express compiles `router.use("/api/foo")` into `^\/api\/foo\/?(?=\/|$)`, and a
  // param mount like `.use("/:wsId/quotations")` into a capture group. Recover both
  // so the output is a comparable path rather than a regexp.
  const src = layer.regexp.source
    .replace(/^\^/, "")
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, "")
    .replace(/\(\?:\\\/\(\[\^\\\/\]\+\?\)\)/g, "/:param")
    .replace(/\\\//g, "/");
  return src === "/?" || src === "" ? "" : src;
}

function walk(stack, prefix, out) {
  for (const layer of stack) {
    const seg = layerPath(layer);
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());
      for (const m of methods) out.push(`${m} ${prefix}${seg}`);
    } else if (layer.name === "router" && layer.handle?.stack) {
      walk(layer.handle.stack, prefix + seg, out);
    }
  }
}

const app = buildApp();
const router = app._router ?? app.router;
const out = [];
walk(router.stack, "", out);
console.log([...new Set(out)].sort().join("\n"));
process.exit(0);
