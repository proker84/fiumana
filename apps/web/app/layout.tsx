import './globals.css';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });

export const metadata: Metadata = {
  title: {
    default: 'Immobiliare Fiumana | Gestione immobiliare evoluta',
    template: '%s | Immobiliare Fiumana',
  },
  description:
    'Gestione e valorizzazione immobiliare: lungo termine, affitti brevi, property management premium e portfolio selezionato.',
  metadataBase: new URL('https://immobiliarefiumana.it'),
  openGraph: {
    title: 'Immobiliare Fiumana',
    description:
      'Gestione immobiliare evoluta con focus su lungo termine, affitti brevi e asset di valore.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} ${space.variable} dark`}>
      <body className="bg-base text-white">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
