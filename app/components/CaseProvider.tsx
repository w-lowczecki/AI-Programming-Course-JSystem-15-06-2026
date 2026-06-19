"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { AnalyzeResponse } from "@/lib/contracts";

// ── Context shape ─────────────────────────────────────────────────────────────

interface CaseContextValue {
  /** Full analyze response held client-side; null when no active case */
  caseState: AnalyzeResponse | null;
  /** Store the result after a successful /api/analyze call */
  setCaseState: (response: AnalyzeResponse) => void;
  /** Clear all state — used by "Nowe zgłoszenie" (AC-28) */
  clearCaseState: () => void;
}

const CaseContext = createContext<CaseContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * CaseProvider — kliento-stronny provider React trzymający stan zgłoszenia.
 *
 * Stan jest efemeryczny (AC-27): przeżywa nawigację client-side (router.push),
 * ale znika po przeładowaniu strony. Brak persystencji w DB (Out of scope).
 *
 * Montowany w layout.tsx powyżej zarówno strony formularza jak i czatu,
 * dzięki czemu stan przeżywa nawigację między nimi.
 */
export function CaseProvider({ children }: { children: ReactNode }) {
  const [caseState, setCaseStateInternal] = useState<AnalyzeResponse | null>(
    null
  );

  function setCaseState(response: AnalyzeResponse) {
    setCaseStateInternal(response);
  }

  function clearCaseState() {
    setCaseStateInternal(null);
  }

  return (
    <CaseContext.Provider value={{ caseState, setCaseState, clearCaseState }}>
      {children}
    </CaseContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useCaseContext — odczyt i aktualizacja stanu zgłoszenia.
 * Musi być używany wewnątrz CaseProvider.
 */
export function useCaseContext(): CaseContextValue {
  const ctx = useContext(CaseContext);
  if (!ctx) {
    throw new Error("useCaseContext must be used within CaseProvider");
  }
  return ctx;
}
