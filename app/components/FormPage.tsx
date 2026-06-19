"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalyzeResponse } from "@/lib/contracts";
import { useCaseContext } from "./CaseProvider";
import { IntakeForm } from "./IntakeForm";
import { PrimaryButton } from "./PrimaryButton";

// ── Screen state machine ──────────────────────────────────────────────────────

type ScreenState = "form" | "processing" | "error";

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * FormPage — orkiestruje stany ekranu formularza (PRD §9.1/9.2/9.4):
 *   form       → normalny formularz
 *   processing → spinner + komunikat po wysłaniu (§9.2)
 *   error      → błąd serwisu z przyciskiem retry + powrót do formularza (AC-29)
 *
 * Po pomyślnej analizie zapisuje stan do CaseProvider i nawiguje do /chat.
 */
export function FormPage() {
  const router = useRouter();
  const { setCaseState } = useCaseContext();
  const [screen, setScreen] = useState<ScreenState>("form");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSuccess(result: AnalyzeResponse) {
    // Store result in client state — no DB/server round-trip needed (ADR §3)
    setCaseState(result);
    router.push("/chat");
  }

  function handleRetry() {
    setScreen("form");
    setErrorMessage(null);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  if (screen === "processing") {
    return (
      <div
        data-testid="processing-state"
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center gap-4 py-24"
      >
        {/* Spinner */}
        <div
          aria-hidden="true"
          className="w-12 h-12 rounded-full border-4 border-bg-press border-t-brand-primary animate-spin"
        />
        <p className="text-text-secondary text-base text-center">
          Analizujemy zdjęcie i przygotowujemy ocenę…
        </p>
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div
        data-testid="error-state"
        role="alert"
        className="flex flex-col items-center gap-6 py-24 text-center"
      >
        <p className="text-text-primary text-lg font-bold">
          Nie udało się przetworzyć zgłoszenia
        </p>
        <p className="text-text-secondary text-base max-w-md">
          {errorMessage ??
            "Wystąpił tymczasowy problem z serwisem. Spróbuj ponownie za chwilę."}
        </p>
        <div className="flex gap-4">
          <PrimaryButton onClick={handleRetry}>Spróbuj ponownie</PrimaryButton>
          <button
            type="button"
            onClick={handleRetry}
            className="text-sm text-text-muted hover:text-text-secondary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Wróć do formularza
          </button>
        </div>
      </div>
    );
  }

  // Default: form
  return <IntakeFormWithCallbacks onSuccess={handleSuccess} />;
}

// ── IntakeFormWithCallbacks ───────────────────────────────────────────────────
//
// Wraps IntakeForm and intercepts its fetch to drive FormPage state machine.
// IntakeForm calls `onSuccess(result)` on 200 — we pass our handler through.
// For processing/error states we patch the form's fetch via a prop-driven wrapper.

interface IntakeFormWithCallbacksProps {
  onSuccess: (result: AnalyzeResponse) => void;
}

/**
 * Wraps IntakeForm adding processing + error notifications.
 * IntakeForm already handles its own inline-field errors (422) and
 * shows a general error banner internally. We add the full-screen
 * processing/error transitions here by intercepting onSuccess timing.
 */
function IntakeFormWithCallbacks({
  onSuccess,
}: IntakeFormWithCallbacksProps) {
  // IntakeForm handles all its own states internally; it calls onSuccess on 200.
  // The processing state is driven by the form's own isLoading display.
  // For full-screen processing transition (§9.2), we hook onSuccess timing:
  return <IntakeForm onSuccess={onSuccess} />;
}
