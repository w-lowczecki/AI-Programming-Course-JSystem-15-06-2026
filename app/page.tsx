import Image from "next/image";
import { PrimaryButton } from "./components/PrimaryButton";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Image
        src="/logo-icon.svg"
        alt="Logo asystenta serwisowego"
        width={64}
        height={64}
        priority
      />
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          Asystent serwisowy
        </h1>
        <p className="max-w-md text-md text-text-secondary">
          Pomoc przy decyzjach reklamacyjnych i zwrotach sprzętu elektronicznego.
        </p>
      </div>
      <PrimaryButton>Rozpocznij zgłoszenie</PrimaryButton>
    </main>
  );
}
