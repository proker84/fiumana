import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registrazione Ospiti | Immobiliare Fiumana',
  description: 'Compila i dati degli ospiti per la tua prenotazione',
};

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  // This layout removes the main Navbar and Footer for the guest form
  return <>{children}</>;
}
