/**
 * Local mock OpenRouter HTTP server for deterministic E2E testing.
 *
 * Implements the OpenAI-compatible POST /chat/completions endpoint
 * that @openrouter/ai-sdk-provider calls.
 *
 * Scenario selection: the test puts a sentinel in the form's `model` field
 * (e.g. TEST-APPROVE, TEST-REJECT, …). The mock inspects the request prompt
 * body for the sentinel and returns a matching canned response.
 *
 * Supported sentinels:
 *   TEST-APPROVE        — usable image, APPROVE decision
 *   TEST-REJECT         — usable image, REJECT decision
 *   TEST-NMI            — usable image, NEEDS_MORE_INFO decision
 *   TEST-CONDITIONAL    — usable image, CONDITIONAL decision
 *   TEST-ESCALATE       — usable image, ESCALATE decision
 *   TEST-UNUSABLE       — unusable image (usable=false), NEEDS_MORE_INFO decision
 *   TEST-ERROR          — respond HTTP 503 to trigger error state
 *   TEST-REVISION       — chat scenario: stream reply with [REVISED_DECISION] marker
 *   TEST-OFFTOPIC       — chat scenario: stream off-topic decline reply
 *   (default / no sentinel) — TEST-APPROVE behaviour
 *
 * Port is exported so globalSetup / playwright.config can reference it.
 */

import http from "http";

export const MOCK_PORT = 9876;

// ---------------------------------------------------------------------------
// Diagnostic store — last streaming request body (for AC-23 context assertion)
// ---------------------------------------------------------------------------

let lastChatRequestBody: string | null = null;

/** Returns the raw JSON body of the most recent streaming /chat/completions call */
export function getLastChatRequestBody(): string | null {
  return lastChatRequestBody;
}

// ---------------------------------------------------------------------------
// Canned responses — matched to the FROZEN contract (lib/contracts/index.ts)
// ---------------------------------------------------------------------------

/** Vision (generateText) response — plain JSON in text content */
function buildVisionResponse(usable: boolean) {
  // Note: description must NOT contain sentinel strings.
  // The imageDescription is injected verbatim into the decision prompt body,
  // which would cause the sentinel detector to match the wrong scenario.
  const description = usable
    ? "Urządzenie widoczne na zdjęciu. Brak widocznych uszkodzeń mechanicznych. Stan dobry."
    : "Zdjęcie jest nieczytelne lub nie przedstawia urządzenia. Nie można ocenić stanu sprzętu.";

  const analysis = {
    description,
    usable,
    signals: usable
      ? { damaged: false, signsOfUse: false, likelyCause: null, damageType: null }
      : null,
  };

  return JSON.stringify(analysis);
}

/** Decision (generateObject / json mode) response */
function buildDecisionResponse(sentinel: string) {
  const base = {
    greeting: "Dzień dobry,",
    nextSteps: "Prosimy o kontakt z serwisem w celu dalszych kroków.",
    disclaimer:
      "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu firmy.",
    missing: null as string[] | null,
    conditions: null as string[] | null,
  };

  switch (sentinel) {
    case "TEST-APPROVE":
      return {
        ...base,
        outcome: "APPROVE",
        justification:
          "Urządzenie zostało zakupione w ciągu 14 dni, jest w stanie nienaruszonym i spełnia warunki zwrotu zgodnie z polityką firmy.",
      };
    case "TEST-REJECT":
      return {
        ...base,
        outcome: "REJECT",
        justification:
          "Zgłoszenie zostało odrzucone, ponieważ urządzenie wykazuje ślady uszkodzeń mechanicznych, które wykluczają przyjęcie reklamacji zgodnie z polityką.",
      };
    case "TEST-NMI":
      return {
        ...base,
        outcome: "NEEDS_MORE_INFO",
        justification:
          "Nie można wydać decyzji bez dodatkowych informacji dotyczących daty zakupu i opisu usterki.",
        missing: [
          "Wyraźne zdjęcie z widoczną wadą urządzenia",
          "Potwierdzenie daty zakupu (paragon lub faktura)",
        ],
      };
    case "TEST-CONDITIONAL":
      return {
        ...base,
        outcome: "CONDITIONAL",
        justification:
          "Zwrot możliwy warunkowo — urządzenie nosi ślady użytkowania, co może skutkować obniżeniem wartości zwrotu.",
        conditions: [
          "Obniżenie wartości zwrotu o 10% z tytułu śladów użytkowania",
          "Wymagane oryginalne opakowanie i kompletny zestaw akcesoriów",
        ],
      };
    case "TEST-ESCALATE":
      return {
        ...base,
        outcome: "ESCALATE",
        justification:
          "Sprawa wymaga oceny przez konsultanta — wartość urządzenia i charakter zgłoszenia przekraczają zakres automatycznej oceny.",
      };
    case "TEST-UNUSABLE":
      return {
        ...base,
        outcome: "NEEDS_MORE_INFO",
        justification:
          "Zdjęcie jest nieczytelne lub nie przedstawia urządzenia, dlatego nie można dokonać oceny.",
        missing: [
          "Wyraźne, ostre zdjęcie urządzenia",
          "Zdjęcie powinno przedstawiać właściwe urządzenie, nie inne obiekty",
        ],
      };
    default:
      // Default: APPROVE (covers TEST-APPROVE and any unrecognised sentinel)
      return {
        ...base,
        outcome: "APPROVE",
        justification:
          "Urządzenie spełnia warunki zwrotu/reklamacji zgodnie z polityką firmy.",
      };
  }
}

/** Chat reply — streamed as Server-Sent Events in OpenAI delta format */
function buildChatReply(sentinel: string): string {
  if (sentinel === "TEST-REVISION") {
    return "[REVISED_DECISION] Na podstawie podanych informacji zmieniłem swoją ocenę. Nowe okoliczności uzasadniają zmianę decyzji. To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu firmy.";
  }
  if (sentinel === "TEST-OFFTOPIC") {
    return "Przepraszam, mogę pomagać wyłącznie w sprawach związanych z Twoim zgłoszeniem zwrotu lub reklamacji. Czy masz pytania dotyczące Twojego zgłoszenia?";
  }
  return "Rozumiem Twoje pytanie. Na podstawie dostępnych informacji, Twoje zgłoszenie spełnia warunki polityki serwisowej firmy. To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.";
}

// ---------------------------------------------------------------------------
// Sentinel extraction
// ---------------------------------------------------------------------------

function extractSentinel(body: string): string {
  const sentinels = [
    "TEST-APPROVE",
    "TEST-REJECT",
    "TEST-NMI",
    "TEST-CONDITIONAL",
    "TEST-ESCALATE",
    "TEST-UNUSABLE",
    "TEST-ERROR",
    "TEST-REVISION",
    "TEST-OFFTOPIC",
  ];
  for (const s of sentinels) {
    if (body.includes(s)) return s;
  }
  return "TEST-APPROVE";
}

// ---------------------------------------------------------------------------
// OpenAI-compatible response builders
// ---------------------------------------------------------------------------

function nonStreamingResponse(content: string, id = "mock-id-001") {
  return JSON.stringify({
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "mock-model",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  });
}

function streamingResponse(content: string, id = "mock-stream-001"): string[] {
  const chunks: string[] = [];
  const words = content.split(" ");

  // Send words in small groups
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
    chunks.push(
      `data: ${JSON.stringify({
        id,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "mock-model",
        choices: [
          {
            index: 0,
            delta: { role: "assistant", content: chunk },
            finish_reason: null,
          },
        ],
      })}\n\n`
    );
    i += 3;
  }

  chunks.push(
    `data: ${JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: "mock-model",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    })}\n\n`
  );
  chunks.push("data: [DONE]\n\n");

  return chunks;
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

export function createMockServer(): http.Server {
  const server = http.createServer((req, res) => {
    // Diagnostic endpoint: GET /last-chat-body — returns the last streaming request body
    if (req.method === "GET" && req.url === "/last-chat-body") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ body: lastChatRequestBody }));
      return;
    }

    // Match any path ending in /chat/completions (route-tolerant)
    if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const sentinel = extractSentinel(body);

      // TEST-ERROR: return 503
      if (sentinel === "TEST-ERROR") {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Service unavailable (mock)", type: "server_error" } }));
        return;
      }

      let parsed: { stream?: boolean } = {};
      try {
        parsed = JSON.parse(body) as { stream?: boolean };
      } catch {
        parsed = {};
      }

      const isStream = parsed.stream === true;

      if (isStream) {
        // Record for AC-23 context assertion (diagnostic endpoint /last-chat-body)
        lastChatRequestBody = body;

        // Streaming: SSE format
        const chatContent = buildChatReply(sentinel);
        const chunks = streamingResponse(chatContent);

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        let i = 0;
        function sendNext() {
          if (i < chunks.length) {
            res.write(chunks[i]);
            i++;
            setImmediate(sendNext);
          } else {
            res.end();
          }
        }
        sendNext();
      } else {
        // Non-streaming: vision generateText or decision generateObject
        // Detect which call by checking whether the body looks like it has an image
        const isVisionCall = body.includes('"image"') || body.includes("image_url");
        const isUnusable = sentinel === "TEST-UNUSABLE";

        let content: string;
        if (isVisionCall) {
          content = buildVisionResponse(!isUnusable);
        } else {
          // Decision call — generateObject expects JSON matching DecisionSchema
          content = JSON.stringify(buildDecisionResponse(sentinel));
        }

        const response = nonStreamingResponse(content);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(response);
      }
    });
  });

  return server;
}

// ---------------------------------------------------------------------------
// Start / stop helpers for global setup
// ---------------------------------------------------------------------------

export function startMockServer(): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = createMockServer();
    server.on("error", reject);
    server.listen(MOCK_PORT, "127.0.0.1", () => {
      console.log(`[mock-openrouter] Listening on http://127.0.0.1:${MOCK_PORT}`);
      resolve(server);
    });
  });
}

export function stopMockServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
