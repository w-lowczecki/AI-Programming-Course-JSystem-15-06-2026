interface TurnErrorProps {
  onRetry: () => void;
  message?: string;
}

/**
 * Inline błąd tury czatu z przyciskiem ponowienia.
 * Wyświetlany gdy odpowiedź asystenta zakończyła się błędem.
 */
export function TurnError({
  onRetry,
  message = "Nie udało się pobrać odpowiedzi. Wystąpił problem z serwisem.",
}: TurnErrorProps) {
  return (
    <div
      data-testid="turn-error"
      role="alert"
      className="flex items-center gap-3 bg-brand-error/10 border border-brand-error/40 rounded-lg px-4 py-3 self-start mr-auto max-w-[80%]"
    >
      <p className="text-brand-error text-base flex-1">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-brand-error text-sm font-bold underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-error whitespace-nowrap"
        aria-label="Spróbuj ponownie"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
