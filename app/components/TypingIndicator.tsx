/**
 * Wskaźnik pisania — pokazuje że asystent przygotowuje odpowiedź.
 * Trzy animowane kropki z dostępnym opisem.
 */
export function TypingIndicator() {
  return (
    <div
      data-testid="typing-indicator"
      role="status"
      aria-label="Asystent pisze odpowiedź…"
      className="flex items-center gap-1 px-4 py-3 bg-bg-elevated rounded-lg self-start mr-auto w-fit"
    >
      <span className="sr-only">Asystent pisze odpowiedź…</span>
      <span
        aria-hidden="true"
        className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        aria-hidden="true"
        className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        aria-hidden="true"
        className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
