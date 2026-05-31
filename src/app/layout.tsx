import type { Metadata } from "next";
import { InactivityProvider } from "@/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sophos Core — Gestión Académica Inteligente",
  description: "Plataforma SaaS de gestión académica multi-institución potenciada con Inteligencia Artificial. Calificaciones, asistencia y asignaciones en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#090d16] text-white font-sans">
        <InactivityProvider>
          {children}
        </InactivityProvider>
      </body>
    </html>
  );
}
