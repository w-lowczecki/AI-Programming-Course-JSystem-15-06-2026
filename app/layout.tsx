import type { Metadata } from "next";
import "./globals.css";
import { CaseProvider } from "./components/CaseProvider";

export const metadata: Metadata = {
  title: "Asystent serwisowy — Pomoc techniczna",
  description: "Asystent wspierający decyzje serwisowe dla sprzętu elektronicznego",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="h-full">
      <body className="min-h-full flex flex-col bg-bg-base text-text-primary antialiased">
        {/*
          CaseProvider mounted at root layout so client state survives
          client-side navigation between / (form) and /chat (AC-27).
          State is ephemeral — cleared on reload or "Nowe zgłoszenie" (AC-28).
        */}
        <CaseProvider>{children}</CaseProvider>
      </body>
    </html>
  );
}
