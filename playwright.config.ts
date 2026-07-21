import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["line"]]
    : [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173/mtro_scheduler/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/mtro_scheduler/",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], serviceWorkers: "block" },
    },
    {
      name: "pwa-chromium",
      testMatch: /pwa\.spec\.ts/,
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
    },
  ],
});
