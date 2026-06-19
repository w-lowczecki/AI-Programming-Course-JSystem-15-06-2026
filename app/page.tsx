import { FormPage } from "./components/FormPage";

/**
 * Strona główna — formularz zgłoszenia (PRD §9.1/9.2/9.4).
 * FormPage zarządza stanami: form → processing → (chat lub error).
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col px-6 py-8 max-w-2xl w-full mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Asystent serwisowy
      </h1>
      <p className="text-text-secondary mb-8 text-base">
        Wypełnij formularz, aby uzyskać wstępną ocenę swojego zgłoszenia reklamacyjnego lub zwrotu.
      </p>
      <FormPage />
    </main>
  );
}
