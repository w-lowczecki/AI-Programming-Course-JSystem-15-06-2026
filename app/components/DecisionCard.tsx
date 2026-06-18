import type { Decision } from "@/lib/contracts";
import { StatusBadge } from "./ui/StatusBadge";
import { Card } from "./ui/Card";

interface DecisionCardProps {
  decision: Decision;
  isRevised?: boolean;
  className?: string;
}

/**
 * Karta decyzji — renderuje wynik analizy zgłoszenia.
 * Kolejność sekcji (AC-21):
 *   1. Powitanie (greeting)
 *   2. Odznaka statusu (StatusBadge, AC-22)
 *   3. Uzasadnienie (justification)
 *   4. Następne kroki (nextSteps)
 *   5. Brakujące informacje (missing) — gdy podane
 *   6. Warunki (conditions) — gdy podane
 *   7. Zastrzeżenie (disclaimer) — zawsze (AC-19, TAC-001-03)
 */
export function DecisionCard({ decision, isRevised = false, className = "" }: DecisionCardProps) {
  const { greeting, outcome, justification, nextSteps, missing, conditions, disclaimer } =
    decision;

  return (
    <Card
      data-testid="decision-card"
      className={["flex flex-col gap-4", className].filter(Boolean).join(" ")}
    >
      {isRevised && (
        <p className="text-brand-warning text-sm font-bold">
          Zaktualizowana ocena — decyzja uległa zmianie.
        </p>
      )}

      {/* 1. Powitanie */}
      <p className="text-text-primary text-md">{greeting}</p>

      {/* 2. Odznaka statusu */}
      <div>
        <StatusBadge outcome={outcome} />
      </div>

      {/* 3. Uzasadnienie */}
      <section aria-label="Uzasadnienie">
        <h3 className="text-base font-bold text-text-secondary uppercase tracking-wide mb-1">
          Uzasadnienie
        </h3>
        <p className="text-text-primary text-base">{justification}</p>
      </section>

      {/* 4. Następne kroki */}
      <section aria-label="Następne kroki">
        <h3 className="text-base font-bold text-text-secondary uppercase tracking-wide mb-1">
          Następne kroki
        </h3>
        <p className="text-text-primary text-base">{nextSteps}</p>
      </section>

      {/* 5. Brakujące informacje (opcjonalnie) */}
      {missing && missing.length > 0 && (
        <section aria-label="Brakujące informacje" data-testid="missing-section">
          <h3 className="text-base font-bold text-brand-warning uppercase tracking-wide mb-1">
            Potrzebujemy więcej informacji
          </h3>
          <ul className="list-disc list-inside text-text-primary text-base space-y-1">
            {missing.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 6. Warunki (opcjonalnie) */}
      {conditions && conditions.length > 0 && (
        <section aria-label="Warunki" data-testid="conditions-section">
          <h3 className="text-base font-bold text-text-secondary uppercase tracking-wide mb-1">
            Warunki
          </h3>
          <ul className="list-disc list-inside text-text-primary text-base space-y-1">
            {conditions.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 7. Zastrzeżenie — zawsze wyświetlane (AC-19, TAC-001-03) */}
      <footer className="border-t border-bg-press pt-3 mt-2">
        <p className="text-text-muted text-sm italic">{disclaimer}</p>
      </footer>
    </Card>
  );
}
