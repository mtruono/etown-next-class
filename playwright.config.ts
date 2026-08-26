import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 20_000,
  reporter: process.env.CI ? "line" : "html",
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
      GITHUB_REPOSITORY: "",
      VITE_TELEMETRY_ENDPOINT: "http://127.0.0.1:4173/__telemetry",
      VITE_LOCATION_CHECKIN_ENDPOINT: "http://127.0.0.1:4173/__checkin",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
