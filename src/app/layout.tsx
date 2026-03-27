import type { Metadata } from 'next';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata: Metadata = {
  title: 'Immobiliare Fiumana | Gestione Affitti Brevi in Italia',
  description:
    'Specializzati nella gestione professionale di immobili per affitti brevi. Gestione completa, affitto garantito e massima redditività per il tuo immobile.',
  keywords:
    'affitti brevi, gestione immobili, property management, airbnb gestione, affitto garantito, immobiliare italia',
  openGraph: {
    title: 'Immobiliare Fiumana | Gestione Affitti Brevi',
    description:
      'Affida il tuo immobile a professionisti. Gestione completa per affitti brevi con rendimenti garantiti.',
    type: 'website',
    locale: 'it_IT',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen flex flex-col">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
