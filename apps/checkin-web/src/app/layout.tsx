import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Check-in Online | Fiumana Immobiliare",
  description: "Completa il check-in online per il tuo soggiorno",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-slate-900 text-white min-h-screen`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                  <span className="text-slate-900 font-bold text-lg">F</span>
                </div>
                <span className="font-display font-semibold text-lg">
                  Fiumana Immobiliare
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-800 py-6">
            <div className="max-w-2xl mx-auto px-4 text-center text-sm text-slate-500">
              <p>&copy; {new Date().getFullYear()} Fiumana Immobiliare</p>
              <p className="mt-1">I tuoi dati sono protetti e cifrati</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
