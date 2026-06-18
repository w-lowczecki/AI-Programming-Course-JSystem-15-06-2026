---
name: project-e2e-setup
description: E2E testing infrastructure for the Hardware Service Decision Copilot PoC — mock server, sentinel strategy, POM, known bugs
metadata:
  type: project
---

## E2E infrastructure (as of 2026-06-18, branch feat/poc-implementation)

**Stack:** Playwright 1.61.0, workers=1, no parallelism, real Next.js dev server started by webServer config.

**Mock OpenRouter server:** `e2e/mock-openrouter/server.ts` (TypeScript) + `e2e/mock-openrouter/smoke-server.js` (CJS, manual smoke).
- Port: 9876
- Route-tolerant: matches any path ending in `/chat/completions`
- Started/stopped via `e2e/global-setup.ts` / `e2e/global-teardown.ts`
- EADDRINUSE: caught in globalSetup, sets `owned=false` so teardown skips close

**Sentinel strategy:** The `model` form field value flows into the LLM prompt as "Model urządzenia: TEST-REJECT". The mock scans the raw request body for sentinel strings to select the canned scenario. Sentinels: TEST-APPROVE, TEST-REJECT, TEST-NMI, TEST-CONDITIONAL, TEST-ESCALATE, TEST-UNUSABLE, TEST-ERROR, TEST-REVISION, TEST-OFFTOPIC.

**Critical rule:** Vision `buildVisionResponse()` must NOT embed sentinel strings in the description. The imageDescription is injected verbatim into the decision prompt body — any sentinel in the description short-circuits sentinel detection for the decision call.

**Non-streaming vs streaming detection:** `isVisionCall = body.includes('"image"') || body.includes("image_url")`. If `stream === true` → SSE streaming reply (chat). Otherwise → non-streaming (vision or decision).

**TEST-ERROR:** Returns HTTP 503 immediately (before reading body fully). The analyze route propagates this as 503 to the frontend, which shows `role="alert"` with "problem" text; URL stays at `/`.

**Page Object Models:** `e2e/pages/IntakeFormPage.ts`, `e2e/pages/ChatScreenPage.ts`.
Fixture image: `e2e/fixtures/device.jpg` (minimal valid 332-byte JPEG).

**Known production bug:** `UIMessageSchema.id` is `z.string()` (required) in `lib/contracts/index.ts`, but `@ai-sdk/react` useChat v4 strips `id` before sending (default `sendExtraMessageFields=false`). Every chat follow-up → 422. Fix: `z.string().optional()`. E2E chat tests document this and verify TurnError (AC-29) path.

**Why:** AGENTS.md says E2E must use real stack, no mocking. The deterministic mock IS the stack — it's a real HTTP server replacing OpenRouter, not a Playwright route mock.

**How to apply:** When adding new E2E scenarios, add a sentinel to `extractSentinel()` in server.ts and add canned responses to `buildVisionResponse`, `buildDecisionResponse`, `buildChatReply`. Never embed sentinels in vision description output.
