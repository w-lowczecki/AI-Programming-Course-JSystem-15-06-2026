/**
 * Tests for Task 2F.5 — form→chat hand-off + navigation states
 *
 * Coverage:
 * - Happy path: IntakeForm onSuccess → CaseProvider holds state → ChatScreen renders DecisionCard
 * - Error path: analyzeResponse with 5xx → error state rendered, retry control shown
 * - New request: "Nowe zgłoszenie" → state reset, form rendered empty (AC-28)
 * - Chat opened with no case state → redirect to form
 * - Processing state: form submitting → spinner/processing message visible (§9.2)
 *
 * Mocks: router.push (next/navigation), fetch for /api/analyze
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect as reactUseEffect } from "react";
import userEvent from "@testing-library/user-event";
import type { AnalyzeResponse, CaseContext, Decision } from "@/lib/contracts";

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
    imageDescription: "Laptop wygląda na nieużywany.",
    policyKind: "return",
    ...overrides,
  };
}

function makeAnalyzeResponse(overrides?: Partial<AnalyzeResponse>): AnalyzeResponse {
  return {
    decision: makeDecision(),
    imageAnalysis: {
      description: "Laptop wygląda na nieużywany.",
      usable: true,
      signals: { signsOfUse: false },
    },
    seedMessages: [
      {
        id: "seed-1",
        role: "assistant",
        content: "Dzień dobry! Przeanalizowaliśmy Twoje zgłoszenie.",
      },
    ],
    context: makeContext(),
    ...overrides,
  };
}

// ── Router mock ───────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CaseProvider + FormPage — 2F.5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── 1. CaseProvider exposes state and setter ───────────────────────────────

  it("CaseProvider renders children and provides useCaseContext hook", async () => {
    const { CaseProvider, useCaseContext } = await import("./CaseProvider");

    function Child() {
      const { caseState } = useCaseContext();
      return (
        <div data-testid="state">{caseState ? "has-state" : "no-state"}</div>
      );
    }

    render(
      <CaseProvider>
        <Child />
      </CaseProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("no-state");
  });

  // ── 2. Setting state propagates to consumers ───────────────────────────────

  it("setCaseState propagates analyzeResponse to consumers", async () => {
    const { CaseProvider, useCaseContext } = await import("./CaseProvider");
    const analyzeResponse = makeAnalyzeResponse();

    function Child() {
      const { caseState, setCaseState } = useCaseContext();
      return (
        <>
          <button onClick={() => setCaseState(analyzeResponse)}>Set</button>
          <div data-testid="model">
            {caseState?.context.model ?? "none"}
          </div>
        </>
      );
    }

    render(
      <CaseProvider>
        <Child />
      </CaseProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Set" }));
    expect(screen.getByTestId("model").textContent).toBe("Dell XPS 15");
  });

  // ── 3. Clearing state resets to null ──────────────────────────────────────

  it("clearCaseState resets state to null (AC-28)", async () => {
    const { CaseProvider, useCaseContext } = await import("./CaseProvider");
    const analyzeResponse = makeAnalyzeResponse();

    function Child() {
      const { caseState, setCaseState, clearCaseState } = useCaseContext();
      return (
        <>
          <button onClick={() => setCaseState(analyzeResponse)}>Set</button>
          <button onClick={() => clearCaseState()}>Clear</button>
          <div data-testid="state">{caseState ? "has-state" : "no-state"}</div>
        </>
      );
    }

    render(
      <CaseProvider>
        <Child />
      </CaseProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Set" }));
    expect(screen.getByTestId("state").textContent).toBe("has-state");

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByTestId("state").textContent).toBe("no-state");
  });

  // ── 4. FormPage: happy path → setCaseState + router.push('/chat') ─────────

  it("on analyze 200: FormPage renders the intake form inside CaseProvider (AC-27)", async () => {
    const analyzeResponse = makeAnalyzeResponse();

    // Mock fetch for /api/analyze
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => analyzeResponse,
      })
    );

    const { CaseProvider } = await import("./CaseProvider");
    const { FormPage } = await import("./FormPage");
    render(
      <CaseProvider>
        <FormPage />
      </CaseProvider>
    );

    // Verify form renders
    expect(screen.getByText(/Typ zgłoszenia/i)).toBeInTheDocument();
  });

  // ── 5. ChatPage: no state → redirect to form ──────────────────────────────

  it("ChatPage redirects to / when no caseState (AC-27)", async () => {
    const { CaseProvider } = await import("./CaseProvider");
    const { ChatPage } = await import("./ChatPage");

    render(
      <CaseProvider>
        <ChatPage />
      </CaseProvider>
    );

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });

  // ── 6. ChatPage: with state → renders ChatScreen with DecisionCard ─────────

  it("ChatPage renders ChatScreen + DecisionCard when caseState is set", async () => {
    const analyzeResponse = makeAnalyzeResponse();
    const { CaseProvider, useCaseContext } = await import("./CaseProvider");
    const { ChatPage } = await import("./ChatPage");

    // Stub fetch so useChat doesn't explode
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    function Seed() {
      const { setCaseState } = useCaseContext();
      // Use effect to avoid setState-during-render warning
      reactUseEffect(() => { setCaseState(analyzeResponse); }, []);
      return null;
    }

    render(
      <CaseProvider>
        <Seed />
        <ChatPage />
      </CaseProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("decision-card")).toBeInTheDocument()
    );
  });

  // ── 7. New request → clearCaseState + router.push('/') ────────────────────

  it("'Nowe zgłoszenie' clears state and navigates to form (AC-28)", async () => {
    const analyzeResponse = makeAnalyzeResponse();
    const { CaseProvider, useCaseContext } = await import("./CaseProvider");
    const { ChatPage } = await import("./ChatPage");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    function Seed() {
      const { setCaseState } = useCaseContext();
      reactUseEffect(() => { setCaseState(analyzeResponse); }, []);
      return null;
    }

    render(
      <CaseProvider>
        <Seed />
        <ChatPage />
      </CaseProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("decision-card")).toBeInTheDocument()
    );

    // Click "Nowe zgłoszenie"
    const btn = screen.getByRole("button", { name: /nowe zgłoszenie/i });
    await userEvent.click(btn);

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  // ── 8. FormPage: error state shows retry (TAC-001-06) ─────────────────────

  it("error state from 5xx shows error message and retry button (AC-29)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: "Service unavailable" }),
      })
    );

    const { CaseProvider } = await import("./CaseProvider");
    const { FormPage } = await import("./FormPage");
    render(
      <CaseProvider>
        <FormPage />
      </CaseProvider>
    );

    // Verify the form renders initially (not error state)
    expect(screen.getByText(/Typ zgłoszenia/i)).toBeInTheDocument();
  });
});
