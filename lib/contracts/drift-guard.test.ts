/**
 * drift-guard.test.ts — Task 3.1 contract drift guard
 *
 * Asserts that the exact shapes the UI sends match what the route parsers expect.
 * This is a static-structural test — no LLM calls, no network, no filesystem.
 *
 * Two scenarios guarded:
 *   A) The FormData produced by IntakeForm validates against IntakeFormSchema
 *      (what /api/analyze parses from the multipart request).
 *   B) The JSON body produced by useChat({ body: { context } }) validates against
 *      ChatRequestBodySchema (what /api/chat parses from the JSON request).
 *
 * If either schema changes incompatibly with the UI, this test fails first.
 */

import { describe, it, expect } from "vitest";
import {
  IntakeFormSchema,
  ChatRequestBodySchema,
  UIMessageSchema,
  AnalyzeResponseSchema,
  CaseContextSchema,
  type CaseContext,
} from "./index";

// ---------------------------------------------------------------------------
// Helpers — mirror what IntakeForm.handleSubmit builds
// ---------------------------------------------------------------------------

/** Build the raw field object that /api/analyze extracts from formData.get(...) */
function buildAnalyzeFormFields(overrides?: Partial<Record<string, string | undefined>>) {
  return {
    requestType: "complaint",
    category: "Smartfon",
    model: "Samsung Galaxy S24",
    purchaseDate: "2025-06-01",
    reason: "Ekran przestał działać po tygodniu użytkowania.",
    ...overrides,
  };
}

/** Build the exact JSON body useChat v4 sends: { messages, context }.
 *  useChat appends the static `body` option to the messages payload.
 *  ADR-001 FE-1 / ADR-002 §3.
 */
function buildChatRequestBody(contextOverrides?: Partial<CaseContext>) {
  const context: CaseContext = {
    requestType: "complaint",
    category: "Smartfon",
    model: "Samsung Galaxy S24",
    purchaseDate: "2025-06-01",
    reason: "Ekran przestał działać po tygodniu użytkowania.",
    imageDescription: "Urządzenie z wyraźnym pęknięciem ekranu widocznym w górnej części.",
    policyKind: "complaint",
    ...contextOverrides,
  };

  // The seed message id/role/content that useChat sends back in subsequent turns
  // matches exactly the shape IntakeForm passes as initialMessages
  const messages = [
    {
      id: "seed-001",
      role: "assistant" as const,
      content: "Oto wstępna ocena Twojego zgłoszenia.",
    },
    {
      id: "msg-002",
      role: "user" as const,
      content: "Czy mogę liczyć na pozytywne rozpatrzenie?",
    },
  ];

  return { messages, context };
}

/**
 * Build the actual wire payload that @ai-sdk/react v4 useChat POSTs on follow-up turns.
 * Source: node_modules/@ai-sdk/react/dist/index.js lines 310-330 (triggerRequest).
 * When sendExtraMessageFields=false (default), useChat strips id and createdAt —
 * only role, content, and conditionally present fields are sent.
 */
function buildV4WireMessages() {
  // Exactly what useChat destructures and sends — no id, no createdAt
  return [
    {
      role: "assistant" as const,
      content: "Oto wstępna ocena Twojego zgłoszenia.",
    },
    {
      role: "user" as const,
      content: "Czy mogę liczyć na pozytywne rozpatrzenie?",
    },
  ];
}

// ---------------------------------------------------------------------------
// A) FormData field names → IntakeFormSchema
// ---------------------------------------------------------------------------

describe("Drift guard A — IntakeForm fields match IntakeFormSchema (analyze route parser)", () => {
  it("exact complaint form fields pass IntakeFormSchema validation", () => {
    const fields = buildAnalyzeFormFields();
    const result = IntakeFormSchema.safeParse(fields);
    expect(result.success).toBe(true);
  });

  it("exact return form fields (without reason) pass IntakeFormSchema", () => {
    const fields = buildAnalyzeFormFields({
      requestType: "return",
      reason: undefined,
    });
    const result = IntakeFormSchema.safeParse(fields);
    expect(result.success).toBe(true);
  });

  it("field name 'requestType' is consumed by the schema (not 'type' or 'request_type')", () => {
    // If the form used a different field name, this would fail
    const wrongName = { type: "complaint", category: "Smartfon", model: "X", purchaseDate: "2025-01-01" };
    const result = IntakeFormSchema.safeParse(wrongName);
    expect(result.success).toBe(false);
  });

  it("field name 'purchaseDate' is consumed by the schema (not 'date' or 'purchase_date')", () => {
    const wrongName = {
      requestType: "complaint",
      category: "Smartfon",
      model: "X",
      purchase_date: "2025-01-01",
      reason: "Usterka",
    };
    const result = IntakeFormSchema.safeParse(wrongName);
    expect(result.success).toBe(false);
  });

  it("all 6 FormData field names the form sends are recognized by the schema", () => {
    // The form sends: requestType, category, model, purchaseDate, reason, image
    // image is validated separately in the route, not in IntakeFormSchema
    // These 5 core fields must all be accepted:
    const allFields = buildAnalyzeFormFields();
    const parsed = IntakeFormSchema.safeParse(allFields);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.requestType).toBe("complaint");
      expect(parsed.data.category).toBe("Smartfon");
      expect(parsed.data.model).toBe("Samsung Galaxy S24");
      expect(parsed.data.purchaseDate).toBe("2025-06-01");
      expect(parsed.data.reason).toBe("Ekran przestał działać po tygodniu użytkowania.");
    }
  });
});

// ---------------------------------------------------------------------------
// B) useChat body → ChatRequestBodySchema
// ---------------------------------------------------------------------------

describe("Drift guard B — useChat body { messages, context } matches ChatRequestBodySchema", () => {
  it("exact useChat body passes ChatRequestBodySchema", () => {
    const body = buildChatRequestBody();
    const result = ChatRequestBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("context field name 'context' is required at the top level (not 'caseContext')", () => {
    const body = buildChatRequestBody();
    const wrongKey = { messages: body.messages, caseContext: body.context };
    const result = ChatRequestBodySchema.safeParse(wrongKey);
    expect(result.success).toBe(false);
  });

  it("messages field name 'messages' is required at top level (not 'history')", () => {
    const body = buildChatRequestBody();
    const wrongKey = { history: body.messages, context: body.context };
    const result = ChatRequestBodySchema.safeParse(wrongKey);
    expect(result.success).toBe(false);
  });

  it("CaseContext shape: all required fields must be present in context", () => {
    const body = buildChatRequestBody();
    // context without imageDescription should fail CaseContextSchema
    const badContext = { ...body.context };
    // @ts-expect-error deliberately deleting required field
    delete badContext.imageDescription;
    const result = CaseContextSchema.safeParse(badContext);
    expect(result.success).toBe(false);
  });

  it("messages can be empty array (initial context request)", () => {
    const result = ChatRequestBodySchema.safeParse({
      messages: [],
      context: buildChatRequestBody().context,
    });
    expect(result.success).toBe(true);
  });

  it("message role 'user' is accepted", () => {
    const result = ChatRequestBodySchema.safeParse({
      messages: [{ id: "1", role: "user", content: "Pytanie" }],
      context: buildChatRequestBody().context,
    });
    expect(result.success).toBe(true);
  });

  it("message role 'assistant' is accepted (seed message echoed back)", () => {
    const result = ChatRequestBodySchema.safeParse({
      messages: [{ id: "1", role: "assistant", content: "Odpowiedź" }],
      context: buildChatRequestBody().context,
    });
    expect(result.success).toBe(true);
  });

  it("return flow context (without reason) passes ChatRequestBodySchema", () => {
    const result = ChatRequestBodySchema.safeParse(
      buildChatRequestBody({
        requestType: "return",
        policyKind: "return",
        reason: undefined,
      })
    );
    expect(result.success).toBe(true);
  });

  // v4 useChat compatibility — id is absent from actual wire payload (chat 422 fix 2026-06-18)
  it("v4 useChat wire payload WITHOUT id passes ChatRequestBodySchema (regression guard for 422 bug)", () => {
    const result = ChatRequestBodySchema.safeParse({
      messages: buildV4WireMessages(),
      context: buildChatRequestBody().context,
    });
    expect(result.success).toBe(true);
  });

  it("v4 useChat wire payload without id passes UIMessageSchema per-message", () => {
    for (const msg of buildV4WireMessages()) {
      const result = UIMessageSchema.safeParse(msg);
      expect(result.success, `message role=${msg.role} without id should parse`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// C) AnalyzeResponse shape — route output matches what UI consumes
// ---------------------------------------------------------------------------

describe("Drift guard C — AnalyzeResponse shape matches UI consumer (ChatScreen / CaseProvider)", () => {
  const validResponse = {
    decision: {
      outcome: "APPROVE" as const,
      greeting: "Dzień dobry! Przeanalizowaliśmy Twoje zgłoszenie.",
      justification: "Zgodnie z §1 polityki zwrotów urządzenie kwalifikuje się do zwrotu.",
      nextSteps: "Proszę odesłać produkt na nasz adres.",
      missing: null,
      conditions: null,
      disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
    },
    imageAnalysis: {
      description: "Urządzenie bez widocznych uszkodzeń.",
      usable: true,
      signals: null,
    },
    seedMessages: [
      {
        id: "seed-001",
        role: "assistant" as const,
        content: "Oto wstępna ocena Twojego zgłoszenia.",
      },
    ],
    context: {
      requestType: "return" as const,
      category: "Laptop" as const,
      model: "Dell XPS 15",
      purchaseDate: "2025-06-01",
      imageDescription: "Urządzenie bez widocznych uszkodzeń.",
      policyKind: "return" as const,
    },
  };

  it("valid AnalyzeResponse passes AnalyzeResponseSchema", () => {
    const result = AnalyzeResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("response has 'decision' key (not 'result' or 'verdict')", () => {
    // @ts-expect-error testing wrong key
    const wrongKey = { verdict: validResponse.decision, ...validResponse };
    delete (wrongKey as Record<string, unknown>).decision;
    const result = AnalyzeResponseSchema.safeParse(wrongKey);
    expect(result.success).toBe(false);
  });

  it("response has 'seedMessages' key (not 'initialMessages' or 'messages')", () => {
    const wrongKey = { ...validResponse, messages: validResponse.seedMessages };
    delete (wrongKey as Record<string, unknown>).seedMessages;
    const result = AnalyzeResponseSchema.safeParse(wrongKey);
    expect(result.success).toBe(false);
  });

  it("response has 'context' key (not 'caseContext' or 'case')", () => {
    const wrongKey = { ...validResponse, caseContext: validResponse.context };
    delete (wrongKey as Record<string, unknown>).context;
    const result = AnalyzeResponseSchema.safeParse(wrongKey);
    expect(result.success).toBe(false);
  });

  it("response has 'imageAnalysis' key (not 'analysis' or 'imageResult')", () => {
    const wrongKey = { ...validResponse, analysis: validResponse.imageAnalysis };
    delete (wrongKey as Record<string, unknown>).imageAnalysis;
    const result = AnalyzeResponseSchema.safeParse(wrongKey);
    expect(result.success).toBe(false);
  });
});
