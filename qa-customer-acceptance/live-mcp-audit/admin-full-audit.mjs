async (page) => {
  const BASE = "https://workspace.demaxtore.com";
  const OUT = "/var/www/demaxtore/DemaxtoreSolitions-main/qa-customer-acceptance/live-mcp-audit/admin";
  const results = { role: "ADMIN", tests: [], bugs: [], consoleErrors: [], failedRequests: [] };

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
    await page.waitForTimeout(2500);
    await snap(name);
    results.tests.push({ name, path, pass: !page.url().includes("/login"), loadMs: Date.now() - t0, url: page.url() });
  };

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByTestId("login-email").fill("ugur@demaxtore.com");
  await page.getByTestId("login-password").fill("Demaxtore35");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(3000);
  await snap("auth-login");
  results.tests.push({ name: "auth-login", pass: !page.url().includes("/login"), url: page.url() });

  for (const [n, p] of [
    ["dashboard", "/admin/dashboard"],
    ["users", "/admin/users"],
    ["orders", "/admin/orders"],
    ["shipments", "/admin/shipments"],
    ["rfq", "/admin/rfq"],
    ["commoditybid", "/admin/commoditybid"],
    ["freightiq", "/admin/freightiq"],
    ["notifications", "/admin/notifications"],
    ["analytics", "/admin/analytics"],
    ["settings", "/admin/settings"],
    ["demo-vessels-ext", "https://freightiq.demaxtore.com/admin/demo-vessels"],
  ]) {
    if (p.startsWith("http")) {
      await page.goto(p, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      await snap(`mod-${n}`);
      results.tests.push({ name: `mod-${n}`, path: p, pass: true, url: page.url() });
    } else {
      await visit(`mod-${n}`, p);
    }
  }

  results.summary = {
    total: results.tests.length,
    passed: results.tests.filter((t) => t.pass !== false).length,
    consoleErrorCount: results.consoleErrors.length,
    failedApiCount: results.failedRequests.length,
  };
  return results;
}
