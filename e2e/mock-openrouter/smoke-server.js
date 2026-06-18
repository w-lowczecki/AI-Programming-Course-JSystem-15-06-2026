/**
 * Standalone CommonJS mock server for manual smoke tests.
 * Run with: node e2e/mock-openrouter/smoke-server.js
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require("http");

const MOCK_PORT = 9876;

function extractSentinel(body) {
  const sentinels = [
    "TEST-APPROVE", "TEST-REJECT", "TEST-NMI", "TEST-CONDITIONAL",
    "TEST-ESCALATE", "TEST-UNUSABLE", "TEST-ERROR", "TEST-REVISION", "TEST-OFFTOPIC",
  ];
  for (const s of sentinels) {
    if (body.includes(s)) return s;
  }
  return "TEST-APPROVE";
}

const DECISIONS = {
  "TEST-APPROVE": {
    outcome: "APPROVE",
    greeting: "Dzień dobry,",
    justification: "Sprzęt spełnia warunki zwrotu zgodnie z polityką firmy.",
    nextSteps: "Proszę dostarczyć sprzęt do punktu serwisowego.",
    missing: null,
    conditions: null,
    disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
  },
  "TEST-REJECT": {
    outcome: "REJECT",
    greeting: "Dzień dobry,",
    justification: "Zgłoszenie odrzucone — uszkodzenia mechaniczne wykluczają przyjęcie reklamacji.",
    nextSteps: "Możliwa naprawa odpłatna. Proszę kontaktować się z serwisem.",
    missing: null,
    conditions: null,
    disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
  },
  "TEST-NMI": {
    outcome: "NEEDS_MORE_INFO",
    greeting: "Dzień dobry,",
    justification: "Brak wystarczających informacji do wydania decyzji.",
    nextSteps: "Proszę uzupełnić brakujące dane.",
    missing: ["Wyraźne zdjęcie z widoczną wadą urządzenia", "Potwierdzenie daty zakupu"],
    conditions: null,
    disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
  },
  "TEST-CONDITIONAL": {
    outcome: "CONDITIONAL",
    greeting: "Dzień dobry,",
    justification: "Zwrot możliwy warunkowo — urządzenie nosi ślady użytkowania.",
    nextSteps: "Spełnij poniższe warunki aby zrealizować zwrot.",
    missing: null,
    conditions: ["Obniżenie wartości zwrotu o 10%", "Wymagane oryginalne opakowanie i akcesoria"],
    disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
  },
  "TEST-ESCALATE": {
    outcome: "ESCALATE",
    greeting: "Dzień dobry,",
    justification: "Sprawa wymaga oceny przez konsultanta — wartość i charakter zgłoszenia wymagają weryfikacji.",
    nextSteps: "Skontaktujemy się z Tobą w ciągu 24 godzin roboczych.",
    missing: null,
    conditions: null,
    disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
  },
  "TEST-UNUSABLE": {
    outcome: "NEEDS_MORE_INFO",
    greeting: "Dzień dobry,",
    justification: "Zdjęcie jest nieczytelne lub nie przedstawia urządzenia — nie można dokonać oceny.",
    nextSteps: "Proszę przesłać wyraźne zdjęcie właściwego urządzenia.",
    missing: ["Wyraźne, ostre zdjęcie urządzenia", "Zdjęcie musi przedstawiać właściwe urządzenie"],
    conditions: null,
    disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
  },
  "TEST-REVISION": {
    outcome: "APPROVE",
    greeting: "Dzień dobry,",
    justification: "Po uzupełnieniu informacji — sprzęt spełnia warunki zwrotu.",
    nextSteps: "Proszę dostarczyć sprzęt do punktu serwisowego.",
    missing: null,
    conditions: null,
    disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
  },
};

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => { body += chunk.toString(); });
  req.on("end", () => {
    const sentinel = extractSentinel(body);

    if (sentinel === "TEST-ERROR") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Service unavailable (mock)", type: "server_error" } }));
      return;
    }

    let parsed = {};
    try { parsed = JSON.parse(body); } catch {}
    const isStream = parsed.stream === true;
    const isVision = body.includes('"image"') || body.includes("image_url");

    if (isStream) {
      const chatContent =
        sentinel === "TEST-REVISION"
          ? "[REVISED_DECISION] Na podstawie podanych informacji zmieniłem swoją ocenę. To wstępna, niewiążąca ocena."
          : sentinel === "TEST-OFFTOPIC"
            ? "Przepraszam, mogę pomagać wyłącznie w sprawach związanych z Twoim zgłoszeniem."
            : "Rozumiem Twoje pytanie. Twoje zgłoszenie spełnia warunki. To wstępna, niewiążąca ocena.";

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      res.write(`data: ${JSON.stringify({ id: "s1", object: "chat.completion.chunk", choices: [{ index: 0, delta: { role: "assistant", content: chatContent }, finish_reason: null }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ id: "s1", object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      let content;
      if (isVision) {
        const usable = sentinel !== "TEST-UNUSABLE";
        content = JSON.stringify({
          // Note: description must NOT contain sentinel strings — imageDescription is
        // included verbatim in the decision prompt, which would confuse sentinel detection.
        description: usable ? "Urządzenie widoczne na zdjęciu. Brak uszkodzeń." : "Zdjęcie nieczytelne.",
          usable,
          signals: usable ? { damaged: false, signsOfUse: false, likelyCause: null, damageType: null } : null,
        });
      } else {
        content = JSON.stringify(DECISIONS[sentinel] || DECISIONS["TEST-APPROVE"]);
      }

      const response = JSON.stringify({
        id: "m1",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "mock-model",
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(response);
    }
  });
});

server.listen(MOCK_PORT, "127.0.0.1", () => {
  console.log(`[smoke-mock] Listening on http://127.0.0.1:${MOCK_PORT}`);
});

process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
process.on("SIGINT", () => { server.close(() => process.exit(0)); });
