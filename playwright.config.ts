import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      grepInvert: /@phone/,
      // Locally use the installed Chrome (no browser download); CI installs Playwright's Chromium.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel: CI ? undefined : "chrome" },
    },
    {
      name: "phone",
      grep: /@phone/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, channel: CI ? undefined : "chrome" },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/kierunki`,
    reuseExistingServer: !CI,
    timeout: 240_000,
  },
});
