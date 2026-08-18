async (page) => {
  const BASE = "https://workspace.demaxtore.com";
  const OUT = "/var/www/demaxtore/DemaxtoreSolitions-main/qa-customer-acceptance/live-mcp-audit/buyer";
  const results = { role: "BUYER", tests: [], bugs: [], consoleErrors: [], failedRequests: [], perf: {} };

  page.on("console", (msg) => { if (msg.type() === "error") results.consoleErrors.push(msg.text()); });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("/api/")) {
      results.failedRequests.push({ url: res.url().split("?")[0], status: res.status() });
    }
  });

  const snap = async (name) => {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  };

  const visit = async (name, path, passFn) => {
    const t0 = Date.now();
    const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
    await page.waitForTimeout(2000);
    await snap(name);
    const ms = Date.now() - t0;
    const pass = passFn ? await passFn() : true;
    results.tests.push({ name, path, pass, loadMs: ms, status: resp?.status() });
    return pass;
  };

  const login = async (email, password) => {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForTimeout(3000);
  };

  // AUTH — wrong password
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByTestId("login-email").fill("buyer1@acme.test");
  await page.getByTestId("login-password").fill("WrongPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(1500);
  await snap("auth-01-wrong-password");
  results.tests.push({ name: "auth-wrong-password", pass: page.url().includes("/login") });

  // AUTH — valid login
  await login("buyer1@acme.test", "Passw0rd!");
  await snap("auth-02-login-success");
  results.tests.push({ name: "auth-login", pass: !page.url().includes("/login"), url: page.url() });

  const sec = await page.evaluate(() => ({
    lsKeys: Object.keys(localStorage),
    ssKeys: Object.keys(sessionStorage),
    jwtInLs: (JSON.stringify(localStorage).match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []).length,
  }));
  results.security = sec;

  // Hard refresh
  await page.reload({ waitUntil: "networkidle" });
  await snap("auth-03-hard-refresh");
  results.tests.push({ name: "auth-hard-refresh", pass: !page.url().includes("/login") });

  const routes = [
    ["dashboard", "/buyer/dashboard", () => !page.url().includes("/login")],
    ["rfq-list", "/buyer/rfq", () => true],
    ["orders-list", "/buyer/orders", () => true],
    ["shipments", "/buyer/shipments", () => true],
    ["messages", "/buyer/messages", () => true],
    ["notifications", "/buyer/notifications", () => true],
    ["settings", "/buyer/settings", () => true],
    ["commoditybid", "/buyer/commoditybid", () => true],
    ["freightiq-embed", "/buyer/freightiq", () => true],
    ["payments", "/buyer/payments", () => true],
    ["documents", "/buyer/documents", () => true],
  ];

  for (const [name, path, fn] of routes) {
    await visit(`mod-${name}`, path, fn);
  }

  // RBAC — admin forbidden
  await visit("rbac-admin-users", "/admin/users", () =>
    page.url().includes("/login") || page.url().includes("/buyer") || page.url().includes("forbidden") || page.url().includes("404")
  );

  // IDOR probe — random order uuid
  await visit("idor-random-order", "/workspace/order/00000000-0000-0000-0000-000000000099", () =>
    page.getByText(/not found|forbidden|unauthorized|page not found/i).isVisible().catch(() => !page.url().includes("00000000"))
  );

  // Responsive 390
  await page.setViewportSize({ width: 390, height: 844 });
  await visit("responsive-390-dashboard", "/buyer/dashboard", () => true);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Logout if visible
  const logoutBtn = page.getByRole("button", { name: /log out|sign out|çıkış/i });
  if (await logoutBtn.count()) {
    await logoutBtn.first().click();
    await page.waitForTimeout(2000);
    await snap("auth-04-logout");
    results.tests.push({ name: "auth-logout", pass: page.url().includes("/login") });
  }

  results.summary = {
    total: results.tests.length,
    passed: results.tests.filter((t) => t.pass).length,
    failed: results.tests.filter((t) => !t.pass).length,
    consoleErrorCount: results.consoleErrors.length,
    failedApiCount: results.failedRequests.length,
  };
  return results;
}
