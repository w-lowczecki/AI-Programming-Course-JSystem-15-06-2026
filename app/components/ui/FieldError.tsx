interface FieldErrorProps {
  message?: string;
}

/**
 * Inline błąd walidacji pod polem formularza.
 * Renderuje tylko gdy message jest podany.
 * Rola: alert — informuje czytniki ekranu natychmiast.
 */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="text-brand-error text-sm mt-1"
    >
      {message}
    </p>
  );
}
