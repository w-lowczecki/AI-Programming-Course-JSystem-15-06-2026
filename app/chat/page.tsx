import { ChatPage } from "../components/ChatPage";

/**
 * Strona czatu — app/chat/page.tsx
 *
 * ChatPage sprawdza stan zgłoszenia w CaseProvider:
 * - brak stanu → przekierowanie na / (formularz)
 * - stan dostępny → renderuje ChatScreen z useChat
 */
export default function ChatRoute() {
  return (
    <main className="flex flex-1 flex-col h-full">
      <ChatPage />
    </main>
  );
}
