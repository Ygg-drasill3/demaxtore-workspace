import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const isHeaded = process.env.PW_HEADED === "1" || process.env.PW_HEADED === "true";
const frontendPort = process.env.E2E_FRONTEND_PORT ?? "3020";
const apiPort = process.env.E2E_API_PORT ?? "3015";
const frontendUrl = process.env.E2E_FRONTEND_URL ?? `http://127.0.0.1:${frontendPort}`;
const apiUrl = process.env.E2E_API_URL ?? `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: false,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "results.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: frontendUrl,
    screenshot: "only-on-failure",
    trace:      "retain-on-failure",
    video:      "off",
    actionTimeout: 15_000,
    headless: !isHeaded,
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
  projects: [
    {
      name: isHeaded ? "chromium-headed" : "chromium",
      use:  { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `yarn workspace @dmx/backend dev`,
      url: `${apiUrl}/api/healthz`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: apiPort,
        NODE_ENV: "test",
        PAYMENT_PROVIDER: "stub",
        ONLINE_PAYMENTS_ENABLED: "false",
        PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET ?? "e2e-payment-webhook-secret",
        PAYMENT_WEBHOOK_ENFORCE_HMAC: "false",
      },
    },
    {
      command: `yarn workspace @dmx/frontend dev --host 127.0.0.1 --port ${frontendPort}`,
      url: frontendUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
