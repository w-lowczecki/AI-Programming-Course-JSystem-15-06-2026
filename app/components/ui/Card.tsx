import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

/**
 * Tematyczna karta zgodna z design systemem.
 * Tło: bg-bg-tinted, zaokrąglenie: rounded-card (6px), padding: p-4.
 */
export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      className={[
        "bg-bg-tinted",
        "rounded-card",
        "p-4",
        "shadow-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
