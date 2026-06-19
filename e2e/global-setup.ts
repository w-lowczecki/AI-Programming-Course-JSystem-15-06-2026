/**
 * Playwright global setup — starts the mock OpenRouter server
 * before all tests run. Gracefully handles EADDRINUSE (server already running).
 */
import type { Server } from "http";
import { startMockServer } from "./mock-openrouter/server";

// Stash server handle so teardown can find it
const state: { server?: Server; owned: boolean } = { owned: false };
export { state as __mockState };

export default async function globalSetup() {
  try {
    const server = await startMockServer();
    state.server = server;
    state.owned = true;
    console.log("[globalSetup] Mock OpenRouter server started.");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EADDRINUSE") {
      // Server already running (manual smoke test or re-run) — reuse
      console.log("[globalSetup] Mock server already running on port 9876, reusing.");
      state.owned = false;
    } else {
      throw err;
    }
  }
}
