import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CuentaClara - Estados de cuenta a Excel",
  description:
    "Convierte tus estados de cuenta bancarios (PDF) a Excel en segundos. Gratis, seguro y sin subir archivos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es" className={`${jetbrains.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-background text-foreground font-mono">
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
