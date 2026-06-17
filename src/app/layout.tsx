import type { Metadata } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

// Fira Sans (UI) + Fira Code (data / matricules / classification codes) — a
// precise, technical pairing fit for an intelligence console.
const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TAJ — Traitement des Antécédents Judiciaires",
  description:
    "Opération Blackvault — Système sécurisé de gestion des dossiers judiciaires",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`dark ${firaSans.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#07090d] text-[#e6ebf3]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
