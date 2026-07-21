import type { Metadata } from "next";
import { InactivityProvider, ThemeProvider } from "@/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sophos Core — Gestión Académica Inteligente",
  description: "Plataforma SaaS de gestión académica multi-institución potenciada con Inteligencia Artificial. Calificaciones, asistencia y asignaciones en un solo lugar.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/favicon.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased dark"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans transition-colors duration-200">
        <ThemeProvider>
          <InactivityProvider>
            {children}
          </InactivityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

