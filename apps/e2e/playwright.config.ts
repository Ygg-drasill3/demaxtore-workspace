import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const isHeaded = process.env.PW_HEADED === "1" || process.env.PW_HEADED === "true";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "results.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_FRONTEND_URL || (isCI ? "http://127.0.0.1:3000" : "http://127.0.0.1:3010"),
    screenshot: "only-on-failure",
    trace:      "retain-on-failure",
    video:      "off",
    actionTimeout: 10_000,
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
  webServer: isCI
    ? [
        {
          command: "yarn workspace @dmx/backend dev",
          url: "http://127.0.0.1:3001/api/healthz",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            PORT: "3001",
            NODE_ENV: "test",
            PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET ?? "e2e-payment-webhook-secret",
            PAYMENT_WEBHOOK_ENFORCE_HMAC: "false",
          },
        },
        {
          command: "yarn workspace @dmx/frontend dev --host 127.0.0.1 --port 3000",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ]
    : undefined,
});
