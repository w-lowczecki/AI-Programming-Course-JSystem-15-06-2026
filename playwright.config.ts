import { defineConfig, devices } from "@playwright/test";
import { MOCK_PORT } from "./e2e/mock-openrouter/server";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // keep sequential — mock server is shared, tests use different sentinels
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // single worker to avoid mock port conflicts
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      OPENROUTER_API_KEY: "test-key",
      OPENROUTER_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/api/v1`,
      OPENROUTER_MULTIMODAL_MODEL: "test/vision",
      OPENROUTER_DECISION_MODEL: "test/decision",
    },
  },
});
