interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  className?: string;
}

/**
 * Dymek wiadomości w wątku czatu.
 * Użytkownik: prawy, zielone tło (brand-primary).
 * Asystent: lewy, ciemne tło (bg-elevated).
 */
export function MessageBubble({ role, content, className = "" }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      data-testid="message-bubble"
      className={[
        "flex max-w-[80%]",
        isUser
          ? "user self-end ml-auto justify-end"
          : "assistant self-start mr-auto justify-start",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "px-4 py-3 rounded-lg text-base",
          isUser
            ? "bg-brand-primary text-on-brand rounded-br-sm"
            : "bg-bg-elevated text-text-primary rounded-bl-sm",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {content}
      </div>
    </div>
  );
}
