async (page) => {
  const BASE = "https://workspace.demaxtore.com";
  const OUT = "/var/www/demaxtore/DemaxtoreSolitions-main/qa-customer-acceptance/live-mcp-audit/supplier";
  const results = { role: "SUPPLIER", tests: [], bugs: [], consoleErrors: [], failedRequests: [] };

  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

  page.on("console", (msg) => { if (msg.type() === "error") results.consoleErrors.push(msg.text()); });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("/api/")) {
      results.failedRequests.push({ url: res.url().split("?")[0], status: res.status() });
    }
  });

  const snap = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
  const visit = async (name, path) => {
    const t0 = Date.now();
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
    await page.waitForTimeout(2000);
    await snap(name);
    results.tests.push({ name, path, pass: !page.url().includes("/login"), loadMs: Date.now() - t0, url: page.url() });
  };

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByTestId("login-email").fill("supplier1@acme-mfg.test");
  await page.getByTestId("login-password").fill("Passw0rd!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(3000);
  await snap("auth-login");
  results.tests.push({ name: "auth-login", pass: !page.url().includes("/login"), url: page.url() });

  for (const [n, p] of [
    ["dashboard", "/supplier/dashboard"],
    ["orders", "/supplier/orders"],
    ["messages", "/supplier/messages"],
    ["rfq", "/supplier/rfq"],
    ["commoditybid", "/supplier/commoditybid"],
    ["freightiq", "/supplier/freightiq"],
    ["settings", "/supplier/settings"],
  ]) await visit(`mod-${n}`, p);

  await visit("rbac-buyer-dashboard", "/buyer/dashboard");
  const buyerBlocked = page.url().includes("/supplier") || page.url().includes("/login") || page.url().includes("forbidden");
  results.tests.push({ name: "supplier-cannot-access-buyer-dashboard", pass: buyerBlocked });

  await visit("rbac-admin", "/admin/users");
  const adminBlocked = !page.url().includes("/admin/users") || page.getByText(/not found|forbidden/i).isVisible().catch(() => true);
  results.tests.push({ name: "supplier-cannot-access-admin", pass: adminBlocked });

  results.summary = {
    total: results.tests.length,
    passed: results.tests.filter((t) => t.pass !== false).length,
    consoleErrorCount: results.consoleErrors.length,
    failedApiCount: results.failedRequests.length,
  };
  return results;
}
