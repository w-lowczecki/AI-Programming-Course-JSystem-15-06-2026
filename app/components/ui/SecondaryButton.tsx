import type { ButtonHTMLAttributes, ReactNode } from "react";

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * Drugoplanowy przycisk-pigułka zgodny z design systemem.
 * Przezroczyste tło, biały tekst, szare obramowanie (1px), pill radius.
 * Hover: obramowanie białe, delikatne powiększenie.
 */
export function SecondaryButton({
  children,
  className = "",
  ...rest
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center",
        "bg-transparent text-text-primary",
        "font-bold text-base",
        "px-8 py-3 min-h-12",
        "rounded-full",
        "border border-text-secondary",
        "cursor-pointer",
        "transition-all duration-150 ease-out",
        "hover:border-text-primary hover:scale-[1.04]",
        "active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
