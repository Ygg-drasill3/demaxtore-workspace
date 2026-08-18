/**
 * Guards a silent-404 class of bug across the FE/BE seam.
 *
 * The web client turns an RFQ FSM action into a URL segment via an ACTION_PATHS
 * lookup with a kebab-case fallback. Any action this router mounts under a path
 * that is not simply the kebab-cased action name (e.g. `unpublish_rfq` ->
 * `unpublish`) therefore 404s unless the client lists it explicitly. Both sides are
 * read from source so the check cannot go stale.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROUTES = resolve(process.cwd(), "src/modules/rfq/rfq.routes.ts");
const CLIENT_API = resolve(process.cwd(), "../frontend/src/features/rfq/lib/rfq.api.ts");

/** FSM action -> action path this router mounts it under. */
function mountedActions(): Map<string, string> {
  const src = readFileSync(ROUTES, "utf8");
  const re = /post\(\s*"\/:id\/actions\/([a-z0-9-]+)"[\s\S]*?rfqController\.action\("([a-z_]+)"\)/g;
  return new Map([...src.matchAll(re)].map((m) => [m[2], m[1]] as const));
}

/** FSM action -> action path the web client sends. */
function clientPaths(): Map<string, string> {
  const src = readFileSync(CLIENT_API, "utf8");
  const block = /ACTION_PATHS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(src)![1];
  return new Map([...block.matchAll(/(\w+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]] as const));
}

describe("RFQ action path mapping (FE/BE seam)", () => {
  const mounted = mountedActions();

  it("parses the mounted action routes", () => {
    expect(mounted.size).toBeGreaterThan(20);
    // The two that do not follow the kebab-case fallback.
    expect(mounted.get("unpublish_rfq")).toBe("unpublish");
    expect(mounted.get("admin_set_state")).toBe("set-state");
  });

  it("the client sends the mounted path for every action route", () => {
    const client = clientPaths();
    const broken: string[] = [];
    for (const [action, mountedPath] of mounted) {
      const sent = client.get(action) ?? action.replace(/_/g, "-");
      if (sent !== mountedPath) {
        broken.push(`${action}: client sends "${sent}" but route is "${mountedPath}"`);
      }
    }
    expect(broken).toEqual([]);
  });
});
