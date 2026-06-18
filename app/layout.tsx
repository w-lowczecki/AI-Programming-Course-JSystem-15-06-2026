import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
