/**
 * Tests for ChatScreen — Task 2F.4
 *
 * Coverage:
 * - Seed DecisionCard renders on mount (from initialMessages)
 * - Every /api/chat request includes `context` in body (AC-23 / TAC-001-04)
 * - Typing / streaming indicator shown while status is 'submitted' or 'streaming'
 * - TurnError with retry rendered when useChat status === 'error'
 * - Revised decision turn is visually marked (AC-25)
 *
 * Transport is MOCKED — fetch is stubbed; no real HTTP.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnalyzeResponse, CaseContext, Decision, UIMessage } from "@/lib/contracts";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeDecision(overrides?: Partial<Decision>): Decision {
  return {
    outcome: "APPROVE",
    greeting: "Dzień dobry! Przeanalizowaliśmy Twoje zgłoszenie.",
    justification: "Produkt spełnia warunki polityki zwrotów.",
    nextSteps: "Proszę odesłać produkt na nasz adres.",
    missing: null,
    conditions: null,
    disclaimer:
      "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
    ...overrides,
  };
}

function makeContext(overrides?: Partial<CaseContext>): CaseContext {
  return {
    requestType: "return",
    category: "Laptop",
    model: "Dell XPS 15",
    purchaseDate: "2026-01-15",
    reason: undefined,
    imageDescription: "Laptop wygląda na nieużywany, brak śladów użytkowania.",
    policyKind: "return",
    ...overrides,
  };
}

function makeSeedMessages(): UIMessage[] {
  return [
    {
      id: "seed-1",
      role: "assistant",
      content: "Dzień dobry! Przeanalizowaliśmy Twoje zgłoszenie.",
    },
  ];
}

function makeAnalyzeResponse(overrides?: Partial<AnalyzeResponse>): AnalyzeResponse {
  return {
    decision: makeDecision(),
    imageAnalysis: {
      description: "Laptop wygląda na nieużywany.",
      usable: true,
      signals: { signsOfUse: false },
    },
    seedMessages: makeSeedMessages(),
    context: makeContext(),
    ...overrides,
  };
}

// ── Mock fetch helper ─────────────────────────────────────────────────────────

/**
 * Returns a minimal data-stream response that useChat v4 can consume.
 * Format: `data: "...text..."\n\n` style Server-Sent Events.
 */
function makeStreamResponse(text: string): Response {
  const encoder = new TextEncoder();
  // v4 data-stream protocol: lines of `0:"<chunk>"\n`
  const chunk = `0:${JSON.stringify(text)}\n`;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ChatScreen — 2F.4", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ── Dynamic import so we get the real module after vi.stubGlobal ──────────

  async function renderChatScreen(analyzeResponse: AnalyzeResponse) {
    const { ChatScreen } = await import("./ChatScreen");
    return render(
      <ChatScreen analyzeResponse={analyzeResponse} onNewRequest={vi.fn()} />
    );
  }

  // ── 1. Seed decision renders on mount ─────────────────────────────────────

  it("renders DecisionCard from analyzeResponse.decision on mount (FE-2, AC-20)", async () => {
    const response = makeAnalyzeResponse();
    await renderChatScreen(response);

    expect(screen.getByTestId("decision-card")).toBeInTheDocument();
    expect(screen.getByText(/Dzień dobry/)).toBeInTheDocument();
    expect(screen.getByText(/niewiążąca ocena/i)).toBeInTheDocument();
  });

  // ── 2. AC-23 / TAC-001-04 — context in every request ─────────────────────

  it("sends context in request body on every /api/chat request (AC-23, TAC-001-04)", async () => {
    fetchMock.mockResolvedValue(makeStreamResponse("Odpowiedź asystenta"));

    const ctx = makeContext({ model: "ThinkPad X1 Carbon" });
    await renderChatScreen(makeAnalyzeResponse({ context: ctx }));

    const input = screen.getByRole("textbox");
    const submitBtn = screen.getByRole("button", { name: /wyślij|send/i });

    await userEvent.type(input, "Mam pytanie dotyczące zwrotu");
    await userEvent.click(submitBtn);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;

    expect(body).toHaveProperty("context");
    const sentContext = body.context as CaseContext;
    expect(sentContext.model).toBe("ThinkPad X1 Carbon");
    expect(sentContext.requestType).toBe("return");
    expect(sentContext.policyKind).toBe("return");
  });

  // ── 3. Typing indicator while streaming ───────────────────────────────────

  it("shows TypingIndicator while a request is in-flight (AC-24, §9.3)", async () => {
    // Never-resolving fetch keeps status at 'submitted' / 'streaming'
    fetchMock.mockImplementation(() => new Promise(() => {}));

    await renderChatScreen(makeAnalyzeResponse());

    const input = screen.getByRole("textbox");
    const submitBtn = screen.getByRole("button", { name: /wyślij|send/i });

    await userEvent.type(input, "Pytanie");
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.getByTestId("typing-indicator")).toBeInTheDocument()
    );
  });

  // ── 4. TurnError + retry on error ─────────────────────────────────────────

  it("shows TurnError with retry when fetch fails (AC-29, TAC-001-06)", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    await renderChatScreen(makeAnalyzeResponse());

    const input = screen.getByRole("textbox");
    const submitBtn = screen.getByRole("button", { name: /wyślij|send/i });

    await userEvent.type(input, "Pytanie");
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.getByTestId("turn-error")).toBeInTheDocument()
    );

    expect(
      screen.getByRole("button", { name: /spróbuj ponownie/i })
    ).toBeInTheDocument();
  });

  // ── 5. Revised decision is marked (AC-25) ─────────────────────────────────

  it("marks a revised decision card with 'Zaktualizowana ocena' text (AC-25)", async () => {
    // DecisionCard with isRevised=true must show the update label (AC-25)
    const { DecisionCard } = await import("./DecisionCard");
    const revisedDecision = makeDecision({ outcome: "REJECT" });

    render(<DecisionCard decision={revisedDecision} isRevised={true} />);
    expect(screen.getByText(/Zaktualizowana ocena/i)).toBeInTheDocument();
  });

  // ── 6. User message bubble rendered after send ────────────────────────────

  it("renders user message bubble after submission", async () => {
    fetchMock.mockResolvedValue(makeStreamResponse("OK"));

    await renderChatScreen(makeAnalyzeResponse());

    const input = screen.getByRole("textbox");
    const submitBtn = screen.getByRole("button", { name: /wyślij|send/i });

    await userEvent.type(input, "Moje pytanie testowe");
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.getByText("Moje pytanie testowe")).toBeInTheDocument()
    );
  });

  // ── 7. "Nowe zgłoszenie" clears and calls onNewRequest ────────────────────

  it("calls onNewRequest when 'Nowe zgłoszenie' button clicked (AC-28)", async () => {
    const onNewRequest = vi.fn();
    const { ChatScreen } = await import("./ChatScreen");
    render(
      <ChatScreen
        analyzeResponse={makeAnalyzeResponse()}
        onNewRequest={onNewRequest}
      />
    );

    const btn = screen.getByRole("button", { name: /nowe zgłoszenie/i });
    await userEvent.click(btn);

    expect(onNewRequest).toHaveBeenCalledOnce();
  });
});
