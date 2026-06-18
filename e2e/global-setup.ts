/**
 * Playwright global setup — starts the mock OpenRouter server
 * before all tests run.
 */
import { startMockServer } from "./mock-openrouter/server";

// Store server handle on global so teardown can access it
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __mockServer: any;
}

export default async function globalSetup() {
  const server = await startMockServer();
  global.__mockServer = server;
}
