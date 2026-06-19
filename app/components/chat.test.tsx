import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Decision } from "@/lib/contracts";
import { DecisionCard } from "./DecisionCard";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { TurnError } from "./TurnError";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeDecision(outcome: Decision["outcome"], overrides?: Partial<Decision>): Decision {
  return {
    outcome,
    greeting: "Dzień dobry! Przeanalizowaliśmy Twoje zgłoszenie.",
    justification: "Produkt spełnia warunki polityki zwrotów.",
    nextSteps: "Proszę odesłać produkt na nasz adres z wypełnionym formularzem.",
    missing: null,
    conditions: null,
    disclaimer: "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu.",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DecisionCard — AC-21 ordering + AC-22 status badge + TAC-001-03
// ---------------------------------------------------------------------------
describe("DecisionCard", () => {
  const outcomes: Decision["outcome"][] = [
    "APPROVE",
    "REJECT",
    "NEEDS_MORE_INFO",
    "CONDITIONAL",
    "ESCALATE",
  ];

  it.each(outcomes)(
    "renderuje unikalną odznakę statusu dla wyniku %s (AC-22, TAC-001-03)",
    (outcome) => {
      render(<DecisionCard decision={makeDecision(outcome)} />);
      expect(screen.getByTestId("status-badge")).toBeInTheDocument();
    }
  );

  it("zawiera powitanie (greeting) jako pierwszy element treści (AC-21)", () => {
    render(<DecisionCard decision={makeDecision("APPROVE")} />);
    expect(screen.getByText(/Dzień dobry/)).toBeInTheDocument();
  });

  it("zawiera uzasadnienie (justification) (AC-21)", () => {
    render(<DecisionCard decision={makeDecision("APPROVE")} />);
    expect(screen.getByText(/spełnia warunki polityki zwrotów/)).toBeInTheDocument();
  });

  it("zawiera następne kroki (nextSteps) (AC-21)", () => {
    render(<DecisionCard decision={makeDecision("APPROVE")} />);
    expect(screen.getByText(/Proszę odesłać/)).toBeInTheDocument();
  });

  it("ZAWSZE renderuje zastrzeżenie (disclaimer) niezależnie od wyniku (TAC-001-03, AC-19)", () => {
    for (const outcome of outcomes) {
      const { unmount } = render(<DecisionCard decision={makeDecision(outcome)} />);
      expect(
        screen.getByText(/niewiążąca ocena|Ostateczną decyzję/i)
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("renderuje sekcję brakujących informacji (missing) gdy jest podana", () => {
    const decision = makeDecision("NEEDS_MORE_INFO", {
      missing: ["Wyraźne zdjęcie tylnej części urządzenia", "Dowód zakupu"],
    });
    render(<DecisionCard decision={decision} />);
    expect(screen.getByText(/Wyraźne zdjęcie/)).toBeInTheDocument();
    expect(screen.getByText(/Dowód zakupu/)).toBeInTheDocument();
  });

  it("nie renderuje sekcji missing gdy jest null", () => {
    render(<DecisionCard decision={makeDecision("APPROVE")} />);
    expect(screen.queryByTestId("missing-section")).not.toBeInTheDocument();
  });

  it("renderuje sekcję warunków (conditions) gdy jest podana", () => {
    const decision = makeDecision("CONDITIONAL", {
      conditions: ["Zwrot możliwy po potrąceniu 20% wartości z powodu śladów użytkowania"],
    });
    render(<DecisionCard decision={decision} />);
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });

  it("nie renderuje sekcji conditions gdy jest null", () => {
    render(<DecisionCard decision={makeDecision("APPROVE")} />);
    expect(screen.queryByTestId("conditions-section")).not.toBeInTheDocument();
  });

  it("kolejność sekcji: powitanie → status → uzasadnienie → kroki → zastrzeżenie (AC-21)", () => {
    render(<DecisionCard decision={makeDecision("APPROVE")} />);

    const allText = screen.getByTestId("decision-card").textContent ?? "";

    const greetingPos = allText.indexOf("Dzień dobry");
    const statusPos = allText.indexOf("Pozytywna ocena");
    const justificationPos = allText.indexOf("spełnia warunki");
    const nextStepsPos = allText.indexOf("Proszę odesłać");
    const disclaimerPos = allText.indexOf("niewiążąca ocena");

    expect(greetingPos).toBeLessThan(statusPos);
    expect(statusPos).toBeLessThan(justificationPos);
    expect(justificationPos).toBeLessThan(nextStepsPos);
    expect(nextStepsPos).toBeLessThan(disclaimerPos);
  });
});

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------
describe("MessageBubble", () => {
  it("renderuje wiadomość użytkownika po prawej stronie", () => {
    render(<MessageBubble role="user" content="Moje pytanie" />);
    const bubble = screen.getByTestId("message-bubble");
    expect(bubble).toBeInTheDocument();
    expect(bubble.textContent).toMatch(/Moje pytanie/);
    expect(bubble.className).toMatch(/user|justify-end|self-end|ml-auto/);
  });

  it("renderuje wiadomość asystenta po lewej stronie", () => {
    render(<MessageBubble role="assistant" content="Odpowiedź asystenta" />);
    const bubble = screen.getByTestId("message-bubble");
    expect(bubble.textContent).toMatch(/Odpowiedź asystenta/);
    expect(bubble.className).toMatch(/assistant|justify-start|self-start|mr-auto/);
  });

  it("użytkownik i asystent mają różne style", () => {
    const { unmount: u1, container: c1 } = render(
      <MessageBubble role="user" content="Wiadomość" />
    );
    const userClass = c1.querySelector("[data-testid='message-bubble']")!.className;
    u1();

    const { container: c2 } = render(
      <MessageBubble role="assistant" content="Wiadomość" />
    );
    const assistantClass = c2.querySelector("[data-testid='message-bubble']")!.className;

    expect(userClass).not.toBe(assistantClass);
  });
});

// ---------------------------------------------------------------------------
// TypingIndicator
// ---------------------------------------------------------------------------
describe("TypingIndicator", () => {
  it("renderuje wskaźnik pisania z polskim tekstem lub animacją", () => {
    render(<TypingIndicator />);
    const indicator = screen.getByTestId("typing-indicator");
    expect(indicator).toBeInTheDocument();
  });

  it("ma odpowiednie atrybuty dostępności (aria-live lub aria-label)", () => {
    render(<TypingIndicator />);
    const indicator = screen.getByTestId("typing-indicator");
    const hasAriaLive = indicator.getAttribute("aria-live") !== null;
    const hasAriaLabel = indicator.getAttribute("aria-label") !== null;
    const hasRole = indicator.getAttribute("role") !== null;
    expect(hasAriaLive || hasAriaLabel || hasRole).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TurnError
// ---------------------------------------------------------------------------
describe("TurnError", () => {
  it("renderuje komunikat błędu po polsku", () => {
    render(<TurnError onRetry={vi.fn()} />);
    const error = screen.getByTestId("turn-error");
    expect(error.textContent).toMatch(/błąd|nie udało|problem|spróbuj/i);
  });

  it("zawiera przycisk ponowienia próby (retry)", () => {
    render(<TurnError onRetry={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /ponów|spróbuj ponownie|retry/i })
    ).toBeInTheDocument();
  });

  it("wywołuje onRetry po kliknięciu przycisku", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<TurnError onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: /ponów|spróbuj ponownie|retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("ma rolę alert", () => {
    render(<TurnError onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
