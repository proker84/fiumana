import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-base/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-3">
        <div>
          <h3 className="font-display text-lg">Immobiliare Fiumana</h3>
          <p className="mt-3 text-sm text-white/60">
            Gestione immobiliare evoluta, portfolio premium e affitti brevi con controllo totale.
          </p>
        </div>
        <div className="text-sm text-white/60">
          <p className="font-semibold text-white">Contatti</p>
          <p className="mt-3">info@immobiliarefiumana.it</p>
          <p>+39 0541 000 000</p>
          <p>Rimini, Italia</p>
        </div>
        <div className="text-sm text-white/60">
          <p className="font-semibold text-white">Link rapidi</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/servizi" className="hover:text-cyan">
              Servizi
            </Link>
            <Link href="/portfolio" className="hover:text-cyan">
              Portfolio
            </Link>
            <Link href="/proprietari" className="hover:text-cyan">
              Proprietari
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        © 2025 Immobiliare Fiumana. Tutti i diritti riservati.
      </div>
    </footer>
  );
}
