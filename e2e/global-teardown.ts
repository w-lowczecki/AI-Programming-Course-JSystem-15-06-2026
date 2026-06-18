/**
 * Playwright global teardown — shuts down the mock OpenRouter server
 * after all tests have finished (only if this process started it).
 */
import { stopMockServer } from "./mock-openrouter/server";
import { __mockState } from "./global-setup";

export default async function globalTeardown() {
  if (__mockState.owned && __mockState.server) {
    await stopMockServer(__mockState.server);
    console.log("[globalTeardown] Mock server stopped.");
  }
}
