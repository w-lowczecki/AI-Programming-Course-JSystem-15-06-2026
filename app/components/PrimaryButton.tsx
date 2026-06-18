import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * Zielony przycisk-pigułka (Spotify "green pill").
 * Tło: #1ED760, tekst: czarny, promień: 9999px.
 * Przy hover delikatnie powiększa się (scale 1.04).
 */
export function PrimaryButton({
  children,
  className = "",
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center",
        "bg-brand-primary text-on-brand",
        "font-bold text-base",
        "px-8 py-3 min-h-12",
        "rounded-full",
        "border-none cursor-pointer",
        "transition-transform duration-150 ease-out",
        "hover:bg-brand-primary-hover hover:scale-[1.04]",
        "active:bg-brand-primary-press active:scale-100",
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
