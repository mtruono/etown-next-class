import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    env: {
      ...process.env,
      VITE_TELEMETRY_ENDPOINT: "http://127.0.0.1:4173/__telemetry",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
