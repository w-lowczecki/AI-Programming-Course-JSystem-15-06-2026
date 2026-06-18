/**
 * Playwright global teardown — shuts down the mock OpenRouter server
 * after all tests have finished.
 */
import { stopMockServer } from "./mock-openrouter/server";

export default async function globalTeardown() {
  if (global.__mockServer) {
    await stopMockServer(global.__mockServer);
    console.log("[mock-openrouter] Server stopped.");
  }
}
