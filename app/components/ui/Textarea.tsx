import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

/**
 * Tematyczny komponent textarea zgodny z design systemem.
 * Tło: bg-bg-elevated, tekst: text-text-primary, zaokrąglenie: rounded-sm.
 */
export function Textarea({ className = "", ...rest }: TextareaProps) {
  return (
    <textarea
      className={[
        "w-full",
        "bg-bg-elevated text-text-primary",
        "border border-bg-press",
        "rounded-sm",
        "px-3 py-2",
        "text-base",
        "placeholder:text-text-muted",
        "resize-vertical",
        "min-h-24",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}
