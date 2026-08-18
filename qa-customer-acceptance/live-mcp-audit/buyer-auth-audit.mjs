// Executed via Playwright MCP browser_run_code_unsafe — Buyer Auth + Security batch
async (page) => {
  const BASE = "https://workspace.demaxtore.com";
  const OUT = "/var/www/demaxtore/DemaxtoreSolitions-main/qa-customer-acceptance/live-mcp-audit/buyer";
  const results = { role: "BUYER", tests: [], bugs: [], consoleErrors: [], failedRequests: [] };

  page.on("console", (msg) => {
    if (msg.type() === "error") results.consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("/api/")) {
      results.failedRequests.push({ url: res.url(), status: res.status() });
    }
  });

  const snap = async (name) => {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    results.tests.push({ name, screenshot: `${name}.png`, url: page.url() });
  };

  const storageAudit = async (label) => {
    return page.evaluate(() => {
      const ls = { ...localStorage };
      const ss = { ...sessionStorage };
      const jwtInLs = JSON.stringify(ls).match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
      const refreshInConsole = false;
      return {
        localStorageKeys: Object.keys(ls),
        sessionStorageKeys: Object.keys(ss),
        jwtPatternsInLocalStorage: jwtInLs.length,
        hasAccessTokenKey: "accessToken" in ls || "dmx_access_token" in ls || Object.keys(ls).some((k) => k.toLowerCase().includes("token")),
        rawTokenExposure: jwtInLs.slice(0, 3).map((t) => t.slice(0, 20) + "..."),
      };
    });
  };

  // Wrong password
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill("buyer1@acme.test");
  await page.getByLabel(/password/i).fill("WrongPassword123!");
  await page.getByRole("button", { name: /sign in|log in|giriş/i }).click();
  await page.waitForTimeout(1500);
  await snap("01-wrong-password");
  const wrongPwOk = await page.getByText(/invalid|incorrect|wrong|failed|geçersiz|hatalı/i).isVisible().catch(() => false);
  results.tests.push({ name: "wrong-password-blocked", pass: wrongPwOk || page.url().includes("/login") });

  // Valid login
  await page.getByLabel(/email/i).fill("buyer1@acme.test");
  await page.getByLabel(/password/i).fill("Passw0rd!");
  await page.getByRole("button", { name: /sign in|log in|giriş/i }).click();
  await page.waitForURL(/\/(buyer|dashboard|workspace)/, { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(2000);
  await snap("02-login-success");
  const loggedIn = !page.url().includes("/login");
  results.tests.push({ name: "login-success", pass: loggedIn, url: page.url() });

  const sec = await storageAudit("post-login");
  results.security = sec;
  if (sec.jwtPatternsInLocalStorage > 0) {
    results.bugs.push({ severity: "MEDIUM", area: "Security", issue: "JWT-like token visible in localStorage", evidence: sec });
  }

  // Hard refresh
  await page.reload({ waitUntil: "networkidle" });
  await snap("03-hard-refresh");
  results.tests.push({ name: "hard-refresh-session", pass: !page.url().includes("/login") });

  // Unauthorized route (admin)
  await page.goto(`${BASE}/admin/users`);
  await page.waitForTimeout(2000);
  await snap("04-forbidden-admin-users");
  const forbidden = page.url().includes("/login") || page.url().includes("/buyer") || await page.getByText(/forbidden|unauthorized|not found|erişim/i).isVisible().catch(() => false);
  results.tests.push({ name: "buyer-cannot-access-admin-users", pass: forbidden });

  // Dashboard
  await page.goto(`${BASE}/buyer/dashboard`);
  await page.waitForTimeout(2500);
  await snap("05-dashboard");
  results.tests.push({ name: "buyer-dashboard-loads", pass: page.url().includes("dashboard") || page.url().includes("buyer") });

  return results;
}
