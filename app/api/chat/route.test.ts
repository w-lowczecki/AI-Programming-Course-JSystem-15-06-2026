/**
 * Integration tests for POST /api/chat (streaming)
 * Strategy: mock ONLY the LLM (lib/ai/agent chatStream). TAC-002-06.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock lib/ai/agent — only chatStream
// ---------------------------------------------------------------------------

const { mockChatStream } = vi.hoisted(() => ({
  mockChatStream: vi.fn(),
}));

vi.mock("@/lib/ai/agent", () => ({
  analyzeImage: vi.fn(),
  decide: vi.fn(),
  chatStream: mockChatStream,
}));

// Mock loadPolicy to avoid filesystem reads
vi.mock("@/lib/policies", () => ({
  loadPolicy: vi.fn().mockResolvedValue("Polityka testowa: §1. Akceptacja zgłoszeń."),
}));

// Import AFTER mocks
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CASE_CONTEXT = {
  requestType: "complaint" as const,
  category: "Smartfon" as const,
  model: "iPhone 14",
  purchaseDate: "2024-01-15",
  reason: "Pęknięty ekran",
  imageDescription: "Urządzenie wykazuje pęknięcie ekranu.",
  policyKind: "complaint" as const,
};

const USER_MESSAGE = {
  id: "msg-1",
  role: "user" as const,
  content: "Czy reklamacja zostanie rozpatrzona pozytywnie?",
  parts: [],
};

function buildFakeStreamTextResult(responseText = "Tak, reklamacja może zostać rozpatrzona.") {
  // Create a minimal mock of StreamTextResult with toDataStreamResponse
  const encoder = new TextEncoder();
  const responseBody = `0:"${responseText}"\n`;

  const mockResponse = new Response(encoder.encode(responseBody), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });

  return {
    toDataStreamResponse: vi.fn().mockReturnValue(mockResponse),
    textStream: (async function* () { yield responseText; })(),
  };
}

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/chat", () => {
  beforeEach(() => {
    mockChatStream.mockReset();
    mockChatStream.mockResolvedValue(buildFakeStreamTextResult());
  });

  // --- TAC-002-06: system prompt contains policy + context ---

  it("TAC-002-06: valid request returns UI message stream (streaming response)", async () => {
    const req = buildRequest({
      messages: [USER_MESSAGE],
      context: CASE_CONTEXT,
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("TAC-002-06: chatStream called with correct context and messages", async () => {
    const req = buildRequest({
      messages: [USER_MESSAGE],
      context: CASE_CONTEXT,
    });

    await POST(req);

    expect(mockChatStream).toHaveBeenCalledOnce();
    const [callArg] = mockChatStream.mock.calls[0];
    expect(callArg.context).toMatchObject(CASE_CONTEXT);
    expect(callArg.messages).toHaveLength(1);
    expect(callArg.messages[0].content).toBe(USER_MESSAGE.content);
  });

  it("TAC-002-06: toDataStreamResponse is called (v4 useChat-compatible stream)", async () => {
    const fakeResult = buildFakeStreamTextResult();
    mockChatStream.mockResolvedValue(fakeResult);

    const req = buildRequest({
      messages: [USER_MESSAGE],
      context: CASE_CONTEXT,
    });

    await POST(req);

    expect(fakeResult.toDataStreamResponse).toHaveBeenCalledOnce();
  });

  // --- Validation ---

  it("rejects malformed request body (missing context) → 422", async () => {
    const req = buildRequest({
      messages: [USER_MESSAGE],
      // context is missing
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    expect(mockChatStream).not.toHaveBeenCalled();
  });

  it("rejects malformed request body (invalid policyKind) → 422", async () => {
    const req = buildRequest({
      messages: [USER_MESSAGE],
      context: { ...CASE_CONTEXT, policyKind: "invalid" },
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    expect(mockChatStream).not.toHaveBeenCalled();
  });

  it("rejects non-JSON body → 422 or 400", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json{{{",
    });

    const res = await POST(req);
    expect([400, 422]).toContain(res.status);
    expect(mockChatStream).not.toHaveBeenCalled();
  });

  it("accepts return policyKind with return requestType", async () => {
    const returnContext = {
      ...CASE_CONTEXT,
      requestType: "return" as const,
      policyKind: "return" as const,
      reason: undefined,
    };

    const req = buildRequest({
      messages: [USER_MESSAGE],
      context: returnContext,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockChatStream).toHaveBeenCalledOnce();
  });

  // --- Error handling ---

  it("chatStream throws → returns error response (not 200 with fabricated content)", async () => {
    mockChatStream.mockRejectedValue(new Error("Provider unavailable"));

    const req = buildRequest({
      messages: [USER_MESSAGE],
      context: CASE_CONTEXT,
    });

    const res = await POST(req);
    // Should not be 200 with normal content
    expect(res.status).not.toBe(200);
  });

  it("empty messages array is accepted (initial context chat)", async () => {
    const req = buildRequest({
      messages: [],
      context: CASE_CONTEXT,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockChatStream).toHaveBeenCalledOnce();
  });
});
