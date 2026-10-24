import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const CI = !!process.env.CI;

// Locally use the installed Chrome (no browser download); CI installs Playwright's Chromium.
const channel = CI ? undefined : "chrome";

export default defineConfig({
  testDir: "e2e",
  // Puts the database in a known state (input data + a finished plan); see e2e/global-setup.ts.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    trace: "retain-on-failure",
    // Animations (spec 07) are checked in e2e/motion.spec.ts, which opts back in; everything else runs without movement.
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "desktop",
      grepInvert: /@phone/,
      testIgnore: /wgrywanie-danych/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel },
    },
    {
      name: "phone",
      grep: /@phone/,
      testIgnore: /wgrywanie-danych/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, channel },
    },
    {
      // Loading a file replaces all data and plans in the database, so it runs alone, after everything else.
      name: "wgrywanie-danych",
      testMatch: /wgrywanie-danych/,
      dependencies: ["desktop", "phone"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/kierunki`,
    reuseExistingServer: !CI,
    timeout: 240_000,
  },
});
