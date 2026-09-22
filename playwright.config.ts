import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // "list" alone never writes a playwright-report/ dir, so CI's
  // upload-artifact step had nothing to pick up — add the "html" reporter
  // there so a failure is actually inspectable from the workflow run.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI exercises the real production build; locally, reuse a dev server
    // that's already running (from manual QA) instead of paying for a
    // fresh build/start on every run.
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
