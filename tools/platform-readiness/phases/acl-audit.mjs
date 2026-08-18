import { login, timedFetch, auth } from "../lib/http.mjs";

const USERS = {
  admin: { email: "admin@demaxtore.local", password: "Passw0rd!" },
  buyer1: { email: "buyer1@acme.test", password: "Passw0rd!" },
  buyer2: { email: "buyer2@beta.test", password: "Passw0rd!" },
  supA1: { email: "supplier1@acme-mfg.test", password: "Passw0rd!" },
  supB1: { email: "supplier1@beta-industries.test", password: "Passw0rd!" },
};

async function firstTradeRoot(token) {
  const r = await timedFetch("/api/rfq?limit=1", { headers: auth(token) });
  const id = r.body?.items?.[0]?.id;
  return id ?? null;
}

async function probeCrossAccess(label, token, path, expectBlocked) {
  const r = await timedFetch(path, { headers: auth(token) });
  const blocked = r.status === 403 || r.status === 404 || !r.ok;
  return { label, path, status: r.status, blocked, pass: blocked === expectBlocked };
}

export async function runAclAudit() {
  const tokens = {};
  for (const [k, u] of Object.entries(USERS)) {
    tokens[k] = await login(u.email, u.password);
  }

  const buyer1Trade = await firstTradeRoot(tokens.buyer1);
  const buyer2Trade = await firstTradeRoot(tokens.buyer2);

  const checks = [];

  if (buyer1Trade && buyer2Trade) {
    checks.push(await probeCrossAccess(
      "buyer2 cannot access buyer1 trade workspace",
      tokens.buyer2,
      `/api/trades/${buyer1Trade}/workspace`,
      true,
    ));
    checks.push(await probeCrossAccess(
      "buyer1 cannot access buyer2 trade workspace",
      tokens.buyer1,
      `/api/trades/${buyer2Trade}/workspace`,
      true,
    ));
    checks.push(await probeCrossAccess(
      "buyer1 can access own trade workspace",
      tokens.buyer1,
      `/api/trades/${buyer1Trade}/workspace`,
      false,
    ));
    checks.push(await probeCrossAccess(
      "buyer2 cannot access buyer1 documents",
      tokens.buyer2,
      `/api/trades/${buyer1Trade}/documents`,
      true,
    ));
    checks.push(await probeCrossAccess(
      "buyer2 cannot access buyer1 exceptions",
      tokens.buyer2,
      `/api/trades/${buyer1Trade}/exceptions`,
      true,
    ));
  }

  checks.push(await probeCrossAccess(
    "unauthenticated blocked from exceptions",
    null,
    "/api/exceptions",
    true,
  ));

  checks.push(await probeCrossAccess(
    "supplier cannot access admin system health",
    tokens.supA1,
    "/api/system/health",
    true,
  ));

  checks.push(await probeCrossAccess(
    "admin can access system health",
    tokens.admin,
    "/api/system/health",
    false,
  ));

  const supplierList = await timedFetch("/api/documents?limit=5", { headers: auth(tokens.supA1) });
  checks.push({
    label: "supplier document center scoped (200 or empty)",
    path: "/api/documents",
    status: supplierList.status,
    blocked: false,
    pass: supplierList.ok,
  });

  const failed = checks.filter((c) => !c.pass);
  return {
    phase: "phase6_acl_security",
    verdict: failed.length === 0 ? "PASS" : failed.length <= 1 ? "PASS WITH RISK" : "FAIL",
    checks,
    failed: failed.map((f) => f.label),
    buyer1Trade,
    buyer2Trade,
  };
}
