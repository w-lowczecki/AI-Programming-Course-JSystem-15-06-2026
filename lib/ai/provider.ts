import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// ---------------------------------------------------------------------------
// Default model IDs (ADR-000 §7)
// ---------------------------------------------------------------------------

const DEFAULT_MULTIMODAL_MODEL = "openai/gpt-4o";
const DEFAULT_DECISION_MODEL = "anthropic/claude-3.5-sonnet";

// ---------------------------------------------------------------------------
// Lazy provider — created only when a model is first requested, never at
// module-load time. This keeps the test suite and Next.js build green even
// when OPENROUTER_API_KEY is absent from the environment.
//
// Fail-fast: if the key is missing or empty at call time, both factory
// functions throw a clear Polish error (ADR-003 §3, ADR-000 §7).
//
// The cached instance is keyed on the API key so that test isolation (deleting
// and re-adding the key between tests) behaves correctly.
// ---------------------------------------------------------------------------

let _cachedKey: string | null = null;
let _openrouter: ReturnType<typeof createOpenRouter> | null = null;

function getOpenRouter(): ReturnType<typeof createOpenRouter> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Brak wymaganej zmiennej środowiskowej OPENROUTER_API_KEY. Ustaw klucz OpenRouter w pliku .env."
    );
  }

  // Recreate the instance if the key changed (e.g. different test scenario).
  if (_openrouter === null || _cachedKey !== apiKey) {
    _cachedKey = apiKey;
    _openrouter = createOpenRouter({
      apiKey,
      ...(process.env.OPENROUTER_BASE_URL
        ? { baseURL: process.env.OPENROUTER_BASE_URL }
        : {}),
      ...(process.env.OPENROUTER_APP_NAME
        ? { appName: process.env.OPENROUTER_APP_NAME }
        : {}),
      ...(process.env.OPENROUTER_APP_URL
        ? { appUrl: process.env.OPENROUTER_APP_URL }
        : {}),
    });
  }

  return _openrouter;
}

// ---------------------------------------------------------------------------
// Model factories — resolve env var at **call time** so tests can override
// process.env before invoking the factory.
// ---------------------------------------------------------------------------

/**
 * Returns the multimodal (vision) model.
 * Reads `OPENROUTER_MULTIMODAL_MODEL` at call time.
 * MUST NOT be used for decision or chat calls (ADR-003 AI-1).
 * Throws if `OPENROUTER_API_KEY` is missing or empty.
 */
export function getMultimodalModel() {
  const openrouter = getOpenRouter();
  const modelId =
    process.env.OPENROUTER_MULTIMODAL_MODEL ?? DEFAULT_MULTIMODAL_MODEL;
  return openrouter.chat(modelId);
}

/**
 * Returns the decision/chat reasoning model.
 * Reads `OPENROUTER_DECISION_MODEL` at call time.
 * MUST NOT be used for image analysis calls (ADR-003 AI-1).
 * Throws if `OPENROUTER_API_KEY` is missing or empty.
 */
export function getDecisionModel() {
  const openrouter = getOpenRouter();
  const modelId =
    process.env.OPENROUTER_DECISION_MODEL ?? DEFAULT_DECISION_MODEL;
  return openrouter.chat(modelId);
}
