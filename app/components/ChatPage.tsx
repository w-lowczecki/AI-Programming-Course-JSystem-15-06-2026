"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCaseContext } from "./CaseProvider";
import { ChatScreen } from "./ChatScreen";

/**
 * ChatPage — renderuje ChatScreen gdy dostępny jest stan zgłoszenia.
 * Jeśli brak stanu (bezpośrednie wejście lub odświeżenie strony),
 * przekierowuje na formularz (AC-27).
 *
 * Montowany przez app/chat/page.tsx.
 */
export function ChatPage() {
  const router = useRouter();
  const { caseState, clearCaseState } = useCaseContext();

  // Redirect to form if no active case
  useEffect(() => {
    if (!caseState) {
      router.push("/");
    }
  }, [caseState, router]);

  function handleNewRequest() {
    clearCaseState();
    router.push("/");
  }

  if (!caseState) {
    // Render null while redirect is in flight
    return null;
  }

  return (
    <ChatScreen analyzeResponse={caseState} onNewRequest={handleNewRequest} />
  );
}
