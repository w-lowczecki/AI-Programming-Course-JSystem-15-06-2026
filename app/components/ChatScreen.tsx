"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import type { AnalyzeResponse } from "@/lib/contracts";
import { DecisionCard } from "./DecisionCard";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { TurnError } from "./TurnError";
import { PrimaryButton } from "./PrimaryButton";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatScreenProps {
  /** Full analyze response with decision, seedMessages, and context */
  analyzeResponse: AnalyzeResponse;
  /** Called when user clicks "Nowe zgłoszenie" */
  onNewRequest: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Detect if a message content contains a revised-decision marker.
 * The backend agent marks revised decisions with a special prefix (AC-25).
 */
function isRevisedDecision(content: string): boolean {
  return /\[REVISED_DECISION\]/i.test(content);
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Ekran czatu — wyświetla karta decyzji jako pierwsza wiadomość asystenta,
 * a następnie wątek konwersacji z asystentem. AC-23/24/25/28/29.
 *
 * Mechanizm v4 do dołączania `context` do każdego żądania:
 *   `useChat({ body: { context } })` — static body option.
 *   Każde żądanie wysyła zarówno `messages` jak i `context`.
 */
export function ChatScreen({ analyzeResponse, onNewRequest }: ChatScreenProps) {
  const { decision, seedMessages, context } = analyzeResponse;

  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    reload,
  } = useChat({
    api: "/api/chat",
    // v4 static body — context is immutable per session, sent with every request (AC-23)
    body: { context },
    // Seed the conversation with the decision assistant message
    initialMessages: seedMessages.map((m, i) => ({
      id: m.id ?? `seed-${i}`,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  });

  // Auto-scroll to bottom when messages change (guard for jsdom which lacks scrollIntoView)
  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  const isStreaming = status === "submitted" || status === "streaming";
  const hasError = status === "error";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Thread ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
        {/* First assistant message → render as DecisionCard (FE-2, AC-20/21/22) */}
        <DecisionCard decision={decision} />

        {/* Subsequent messages — skip the seed assistant message (index 0) */}
        {messages.slice(1).map((message) => {
          if (message.role === "assistant") {
            const revised = isRevisedDecision(message.content);
            // Future: if revised, parse and show DecisionCard — for now show badge (AC-25)
            return (
              <div key={message.id} className="flex flex-col gap-2">
                {revised && (
                  <p className="text-brand-warning text-sm font-bold self-start">
                    Zaktualizowana ocena — decyzja uległa zmianie.
                  </p>
                )}
                <MessageBubble role="assistant" content={message.content} />
              </div>
            );
          }
          return (
            <MessageBubble key={message.id} role="user" content={message.content} />
          );
        })}

        {/* Typing indicator while streaming (AC-24) */}
        {isStreaming && <TypingIndicator />}

        {/* Per-turn error with retry (AC-29) */}
        {hasError && (
          <TurnError
            onRetry={reload}
            message={
              error?.message ??
              "Nie udało się pobrać odpowiedzi. Wystąpił problem z serwisem."
            }
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Composer ───────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-bg-press px-4 py-4 flex gap-3 items-end bg-bg-base"
      >
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Napisz wiadomość…"
          rows={2}
          disabled={isStreaming}
          aria-label="Wiadomość do asystenta"
          className="flex-1 resize-none rounded-sm bg-bg-elevated text-text-primary placeholder:text-text-muted px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isStreaming && input.trim()) {
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }
          }}
        />
        <PrimaryButton
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="self-end"
        >
          Wyślij
        </PrimaryButton>
      </form>

      {/* ── New request ────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 flex justify-end bg-bg-base">
        <button
          type="button"
          onClick={onNewRequest}
          className="text-sm text-text-muted hover:text-text-secondary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Nowe zgłoszenie
        </button>
      </div>
    </div>
  );
}
