import type { Decision } from "@/lib/contracts";

type Outcome = Decision["outcome"];

interface StatusBadgeProps {
  outcome: Outcome;
  className?: string;
}

const OUTCOME_CONFIG: Record<
  Outcome,
  { label: string; colorClass: string }
> = {
  APPROVE: {
    label: "Pozytywna ocena",
    colorClass: "bg-brand-primary text-on-brand",
  },
  REJECT: {
    label: "Odrzucono",
    colorClass: "bg-brand-error text-text-primary",
  },
  NEEDS_MORE_INFO: {
    label: "Potrzeba więcej informacji",
    colorClass: "bg-brand-warning text-on-brand",
  },
  CONDITIONAL: {
    label: "Warunkowo pozytywna",
    colorClass: "bg-bg-elevated-highlight text-text-primary border border-brand-primary",
  },
  ESCALATE: {
    label: "Eskalacja do konsultanta",
    colorClass: "bg-bg-press text-text-secondary border border-text-secondary",
  },
};

/**
 * Odznaka statusu decyzji — 5 możliwych wyników (AC-22).
 * Każdy wynik ma unikalny kolor i etykietę po polsku.
 */
export function StatusBadge({ outcome, className = "" }: StatusBadgeProps) {
  const { label, colorClass } = OUTCOME_CONFIG[outcome];

  return (
    <span
      data-testid="status-badge"
      role="status"
      className={[
        "inline-flex items-center",
        "px-3 py-1",
        "rounded-full",
        "text-sm font-bold",
        colorClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
  );
}
